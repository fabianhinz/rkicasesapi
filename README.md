# rkicasesapi

- Cloud Function zur Sammlung von COVID-19: Fallzahlen in Deutschland
- Jeden Tag um 12:00 (Europe/Berlin) werden die Fallzahlen vom [Robert Koch Institut](https://www.rki.de/DE/Content/InfAZ/N/Neuartiges_Coronavirus/Fallzahlen.html) ausgelesen und im Google Firestore persistiert 
- über eine kleine REST-API sind diese öffentlich verfügbar GET >> https://europe-west1-rkicasesapi.cloudfunctions.net/get

