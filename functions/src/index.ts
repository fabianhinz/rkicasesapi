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
}

interface EsriCasesAttributes {
    LAN_ew_GEN: string
    Fallzahl: number
    faelle_100000_EW: number
    Death: number
}

type RkiDataWithTimestamp = RkiData<number> & { timestamp: FirebaseFirestore.Timestamp }
// ? Todo >> switch to esri
export const fetchTodaysData = functions
    .region('europe-west1')
    .pubsub.schedule('0 8 * * *').timeZone("Europe/Berlin")
    .onRun(async () => {
        const timestamp = admin.firestore.Timestamp.now()

        const fetch = (await import("node-fetch")).default
        const response = await fetch("https://services7.arcgis.com/mOBPykOjAyBO2ZKk/arcgis/rest/services/Coronaf%C3%A4lle_in_den_Bundesl%C3%A4ndern/FeatureServer/0/query?where=1%3D1&outFields=LAN_ew_GEN,Fallzahl,faelle_100000_EW,Death&returnGeometry=false&outSR=4326&f=json")
        const data: { features: { attributes: EsriCasesAttributes }[] } = await response.json()

        for (const { attributes } of data.features) {
            const dayBeforeDoc = (await firestore.collection('rkicases').where("state", "==", attributes.LAN_ew_GEN).orderBy("timestamp", "desc").limit(1).get()).docs[0]
            const { cases: dayBeforeCases } = dayBeforeDoc.data() as RkiDataWithTimestamp

            const docData: RkiDataWithTimestamp = {
                state: attributes.LAN_ew_GEN,
                cases: attributes.Fallzahl,
                rate: attributes.faelle_100000_EW,
                deaths: attributes.Death,
                delta: attributes.Fallzahl - dayBeforeCases,
                timestamp
            }

            await firestore.collection('rkicases').doc().set(docData)
        }

        return null
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
    .pubsub.schedule('0 8 * * *').timeZone("Europe/Berlin")
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