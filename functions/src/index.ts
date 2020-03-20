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
    delta: string
    rate: T
    deaths: T
    mostAffected: string
}

type RkiDataWithTimestamp = RkiData<number> & { timestamp: FirebaseFirestore.Timestamp }

export const fetchTodaysData = functions
    .region('europe-west1')
    .pubsub.schedule('every 24 hours')
    .onRun(async () => {
        const tabletojson = (await import("tabletojson")).Tabletojson
        const timestamp = admin.firestore.Timestamp.now()

        return tabletojson.convertUrl(
            'https://www.rki.de/DE/Content/InfAZ/N/Neuartiges_Coronavirus/Fallzahlen.html',
            { headings: ["_", "_", "_", "state", "cases", "delta", "rate", "deaths", "mostAffected"] },
            async tablesAsJson => {
                for (const rkiData of (tablesAsJson[0] as RkiData<string>[])) {
                    if (rkiData.state === "Gesamt") continue
                    await firestore.collection('rkicases').doc().set({
                        ...rkiData,
                        timestamp,
                        cases: Number(rkiData.cases.replace(".", "")),
                        rate: Number(rkiData.rate.replace(",", ".")),
                        deaths: Number(rkiData.deaths)
                    } as RkiDataWithTimestamp)
                }
            }
        )

    });

export const get = functions
    .region('europe-west1')
    .https.onRequest(async (req, res) => {
        let query = firestore.collection("rkicases").orderBy("timestamp", "desc").limit(30)

        if (req.query.state) query = query.where("state", "==", req.query.state)

        return query.get().then(documentData =>
            res.send(documentData.docs.map(doc => {
                const { timestamp, ...rkiData } = doc.data() as RkiDataWithTimestamp
                return { date: timestamp.toDate().toJSON(), ...rkiData }
            }))
        )
    }
    )