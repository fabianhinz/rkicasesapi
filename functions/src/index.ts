import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin'

const serviceAccount = require('../service-account.json')
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://rkicasesapi.firebaseio.com"
})
const firestore = admin.firestore()

interface RkiData<T> {
    state: string
    cases: T
    delta: T
    rate: T
    deaths: T
    mostAffected: string
}

type RkiDataWithTimestamp = RkiData<number> & { timestamp: FirebaseFirestore.Timestamp }
// ? Todo >> switch to esri
export const fetchTodaysData = functions
    .region('europe-west1')
    .pubsub.schedule('0 12 * * *').timeZone("Europe/Berlin")
    .onRun(async () => {
        const tabletojson = (await import("tabletojson")).Tabletojson
        const timestamp = admin.firestore.Timestamp.now()

        return tabletojson.convertUrl(
            'https://www.rki.de/DE/Content/InfAZ/N/Neuartiges_Coronavirus/Fallzahlen.html',
            { headings: ["_", "_", "state", "cases", "delta", "rate", "deaths"] },
            async tablesAsJson => {
                for (const rkiData of (tablesAsJson[0] as RkiData<string>[])) {
                    if (rkiData.state === "Gesamt") continue
                    await firestore.collection('rkicases').doc().set({
                        timestamp,
                        state: rkiData.state.replace(/\u00AD/g, "").replace("\n", "").replace('*', ''),
                        cases: Number(rkiData.cases.replace(".", "")),
                        rate: Number(rkiData.rate.replace(".", "").replace(",", ".")),
                        deaths: Number(rkiData.deaths.replace(".", "")),
                        delta: Number(
                            rkiData.delta.replace('*', '').replace('+', '').replace('.', '')
                        )
                    } as RkiDataWithTimestamp)
                }
            }
        )

    });

interface Attributes {
    Bundesland: string
    Genesen: number
    DiffVortag: number
    Datenstand: string
}

interface Feature {
    attributes: Attributes
}

interface RecoveredJson {
    features: Feature[]
}

interface RecoveredDoc {
    state: string
    recovered: number
    delta: number
    esriTimestamp: string
    timestamp: FirebaseFirestore.Timestamp
}

export const fetchTodaysRecovered = functions
    .region('europe-west1')
    .pubsub.schedule('0 12 * * *').timeZone("Europe/Berlin")
    .onRun(async () => {
        const fetch = (await import("node-fetch")).default
        const response = await fetch("https://services7.arcgis.com/mOBPykOjAyBO2ZKk/arcgis/rest/services/RKI_COVID19_Recovered_BL/FeatureServer/0/query?f=json&where=Bundesland%20IS%20NOT%20NULL&returnGeometry=false&spatialRel=esriSpatialRelIntersects&outFields=Bundesland,Genesen,DiffVortag,Datenstand&cacheHint=true")
        const json: RecoveredJson = await response.json()

        const timestamp = admin.firestore.Timestamp.now()
        const promises: Array<Promise<FirebaseFirestore.WriteResult>> = []

        for (const { attributes } of json.features) {
            if (attributes.Bundesland === "Alle Bundesländer") continue
            promises.push(firestore.collection('rkirecovered').doc().set({
                state: attributes.Bundesland,
                recovered: attributes.Genesen,
                delta: attributes.DiffVortag,
                esriTimestamp: attributes.Datenstand,
                timestamp
            } as RecoveredDoc))
        }

        try {
            console.log("esri response saved in collection")
            return await Promise.all(promises)
        } catch (e) {
            console.log("error while saving docs to rkirecovered ", e)
            return null
        }
    })

export const get = functions
    .region('europe-west1')
    .https.onRequest(async (req, res) => {
        // ? 16 states times 30 days
        let query = firestore.collection("rkicases").orderBy("timestamp", "asc").limit(16 * 30)

        if (req.query.state) query = query.where("state", "==", req.query.state)

        return query.get().then(documentData =>
            res.send(documentData.docs.map(doc => {
                const { timestamp, ...rkiData } = doc.data() as RkiDataWithTimestamp
                return { date: timestamp.toDate().toJSON(), ...rkiData }
            }))
        )
    }
    )