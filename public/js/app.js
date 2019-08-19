new Vue({
    el: '#app',
    data: () => {
        return {
            beeping: false,
            selectedMarket: 0,
            order: '',
            notFound: false,
            newEan: '',
            message: '',
            oldEan: '',
            editingEan: false,
            startTime: '',
            endTime: '',
            finished: false,
            isSignedIn: false,
            spreadsheet: '',
            beepers: 0
        }
    },

    watch: {
        order: async function (val) {
            try {
                if (this.beeping) {
                    await this.updateSpreadSheet(val)
                }
            } catch (err) {
                console.log(err)
            }
        }
    },

    headers: ['ean','descricao', 'quantidade', 'encontrados', 'mercado'],
    markets: ['MR', 'Extra', 'Atacadão', 'Guanabara'],

    async mounted() {
        await this.$GoogleAPI.ClientLoad()
        this.$GoogleAPI.api.auth2.getAuthInstance().isSignedIn.listen((isSignedIn) => {
            this.isSignedIn = isSignedIn
        })
        this.isSignedIn = this.$GoogleAPI.api.auth2.getAuthInstance().isSignedIn.get()

        if (!this.isSignedIn) {
            this.$GoogleAPI.api.auth2.getAuthInstance().signIn()
        }

    },

    methods: {
        createSpreadSheet (title) {
            return this.$GoogleAPI.api.client.sheets.spreadsheets.create({
                properties: {
                    title: title
                }
            })
        },

        updateSpreadSheet (order) {
            var rows = [
                ['ean', 'descricao', 'quantidade', 'encontrado', 'mercado', 'trocado'],
                ...order.map(product => [
                    product.ean,
                    product.descricao,
                    product.quantidade,
                    product.found || 0,
                    product.market || '',
                    product.eanChanged || false
                ])
              ]
              var body = {
                values: rows
              }
              return this.$GoogleAPI.api.client.sheets.spreadsheets.values.update({
                 spreadsheetId: this.spreadsheet.spreadsheetId,
                 range: 'A1',
                 valueInputOption:'USER_ENTERED', 
                 resource: body
              })
        },

        startEditingEan () {
            this.editingEan = true
            this.oldEan = ''
        },

        changeProductEan () {
            if (confirm(
                `Deseja trocar o ean ${this.oldEan} pelo o ean ${this.newEan}`
            )) {
                this.order = this.order.map(product => {
                    if (product.ean == this.oldEan) {
                        if (!(product.found > 0)) {
                            product.ean = this.newEan
                            product.eanChanged = true
                        } else {
                            alert('ERRO: Esse produto não pode ser mais alterado!')
                        }
                    }
                    return product
                })
                this.editingEan = false
                this.notFound = false
                this.message = 'Ean alterado com sucesso, veja o resultado na tabela, bipe o próximo produto!'
            }
        },

        async getOrder (event) {
            const csvFile = event.target.files[0]
            var result = await window.fileReader(csvFile)

            this.order = await window.csv({
                noheader: false,
                headers: ['ean','descricao', 'quantidade','nrpedido']
            }).fromString(result.split(';').join(','))
        },

        async checkInputs () {
            if (this.order) {
                try {
                    const separador = prompt('Informe seu nome')
                    const response = await this.createSpreadSheet(`pedidos-${separador}-${new Date().toLocaleString()}`)
                    this.spreadsheet = response.result
                    this.beeping = true
                    this.startTime = Date.now()
                } catch (error) {
                    console.log(error)
                }
            } else {
                alert('Por favor informe o csv do pedido')
            }
        },

        checkEanInput (event) {
            const eaninput = Number(event.target.value)
            event.target.value = ''
            if (!Number.isNaN(eaninput) && eaninput !== 0) {
                this.newEan = eaninput
                this.checkEanInOrder(eaninput)
            } else {
                alert('Por favor digite um EAN válido')
            }
        },

        getEanFromTable (event) {
            this.oldEan = event.target.textContent
        },

        checkEanInOrder (ean) {
            if (this.order.some(p => p.ean == ean)) { //.some -> para algum
                const newOrder = []
                this.order.forEach(product => { //.forEach -> para cada
                    const market = this.$options.markets[this.selectedMarket]

                    if (`${product.ean}-${product.market || market}` == `${ean}-${market}`) {
                        this.message = `Produto "${product.descricao}" encontrado` //textContent -> Insere texto
                        if (!product.found) {
                            product.found = 0
                        }
                        if (product.quantidade > product.found) {

                            if (!product.market) {
                                product.market = market
                            }
                            product.found += 1
                            this.message += ` Falta(m) bipar ${Number(product.quantidade) - product.found} produto(s)`
                        } else {
                            this.message += ', quantidade completa, bipe o próximo produto'
                        }
                    } else if (product.ean == ean && product.market !== market && !product.hasCopy) {
                        const productCopy = Object.assign({}, product)
                        product.hasCopy = true
                        productCopy.quantidade = product.quantidade - product.found
                        product.quantidade = product.found
                        productCopy.found = 1
                        productCopy.market = market
                        newOrder.push(productCopy)
                    }
                    newOrder.push(product) //.append = .push
                })
                this.order = newOrder
            } else {
                this.message = 'Produto NÃO existe no pedido, desaja alterar o EAN do produto no pedido?'
                this.notFound = true
            }

            if (this.order.every(p => p.quantidade == p.found)) {
                this.message = 'O pedido está completo'
                this.endTime = Date.now()
                if (!this.finished) {
                    this.updateSpreadSheet(this.order)
                }
                this.finished = true
            }
        },
    }
})
