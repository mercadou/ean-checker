const googleApiPlugin = {}

googleApiPlugin.install = (Vue, { GoogleAPI, CLIENT_ID, API_KEY, DISCOVERY_DOCS, SCOPES }) => {
  Vue.prototype.$GoogleAPI = {
    api: GoogleAPI,
    ClientLoad: () => {
      return new Promise((resolve, rejects) => {
        GoogleAPI.load('client:auth2', () => {

          resolve(GoogleAPI.client.init({
            apiKey: API_KEY,
            clientId: CLIENT_ID,
            discoveryDocs: DISCOVERY_DOCS,
            scope: SCOPES
          }))

        })
      })
    }
  }
}
