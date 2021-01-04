[![Run in Postman](https://run.pstmn.io/button.svg)](https://app.getpostman.com/run-collection/bfad94a65b5a15486e10#?env%5Brkicasesapi-prod%5D=W3sia2V5IjoiaG9zdCIsInZhbHVlIjoiaHR0cHM6Ly9ldXJvcGUtd2VzdDEtcmtpY2FzZXNhcGkuY2xvdWRmdW5jdGlvbnMubmV0L2dldCIsImVuYWJsZWQiOnRydWV9LHsia2V5IjoiY29sbGVjdGlvbiIsInZhbHVlIjoicmtpY2FzZXMiLCJlbmFibGVkIjp0cnVlfSx7ImtleSI6InN0YXRlIiwidmFsdWUiOiJCYWRlbi1Xw7xydHRlbWJlcmciLCJlbmFibGVkIjp0cnVlfSx7ImtleSI6InN0YXJ0QXREYXRlIiwidmFsdWUiOiIyMDIxLTAxLTA0VDE0OjEzOjE5LjIxNloiLCJlbmFibGVkIjp0cnVlfV0=)

# rkicasesapi

- Cloud Function zur Sammlung und Bereitstellung von COVID-19: Fallzahlen in Deutschland
- Jeden Tag um 12:00 (Europe/Berlin) werden Daten aus folgenden Quellen ausgelesen und persistiert: 
  - Fallzahlen vom [Robert Koch Institut](https://www.rki.de/DE/Content/InfAZ/N/Neuartiges_Coronavirus/Fallzahlen.html)
  - Genesene vom [esri](https://npgeo-corona-npgeo-de.hub.arcgis.com/search?groupIds=b28109b18022405bb965c602b13e1bbc)  
