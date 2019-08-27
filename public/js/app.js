const strings = {
    ean : 'GTIN',
    description: 'Descrição',
    amount: 'Quantidade',
    orderNumber: 'Número do Pedido',
    category: 'Categoria',
    user: 'Separador',
    found: 'Encontrado',
    market: 'Mercado',
    eanChanged: 'Trocado',
    similar: 'Similar de'
}

new Vue({
    el: '#app',
    data: () => {
        return {
            beeping: false,
            selectedUser: '',
            selectedMarket: 'MR',
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
            addingSimilar: false,
            similarDescription: '',
            loading: false,
        }
    },

    watch: {
        order: async function (order) {
            this.loading = true
            try {
                if (this.beeping) {
                    const response = await this.updateSpreadSheet(order)
                }
            } catch (err) {
                console.log(err)
            }
            this.loading = false
        }
    },

    headers: ['ean','descricao', 'categoria', 'quantidade', 'encontrados', 'mercado','pedido'],
    markets: ['MR', 'Extra', 'Atacadão', 'Guanabara'],
    users: ['Maykon', 'Jorge'],
    spreadsheet: {
        spreadsheetId: '1fMt8QRD7zVYaDR9pCKUw-ox43B1hNAMWjX_cLOKTUv4',
        name: 'Teste'
    },
    ...strings,

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

        removeDuplicates (list) {
            return list.filter((v,i) => list.indexOf(v) === i)
        },

        updateSpreadSheet (order) {
            var newline = false
            var rows = [
                Object.values(strings),
                ...order.map(product => {
                    if (product.updated || newline) {
                        if (!newline) {
                            const eans = order.map(p => p[strings.ean])
                            const uniqueEan = this.removeDuplicates(eans)
                            if (eans.length !== uniqueEan.length) {
                                newline = true
                            }
                        }

                        product.updated = false
                        return [
                            product[strings.ean],
                            product[strings.description],
                            product[strings.amount],
                            product[strings.orderNumber],
                            product[strings.category],
                            product[strings.user],
                            product[strings.found] || 0,
                            product[strings.market] || '',
                            product[strings.eanChanged] || false,
                            product[strings.similar] || ''
                        ]
                    }
                    return []
                })
              ]
              var body = {
                values: rows
              }
              return this.$GoogleAPI.api.client.sheets.spreadsheets.values.update({
                 spreadsheetId: this.$options.spreadsheet.spreadsheetId,
                 range: this.$options.spreadsheet.name,
                 valueInputOption:'USER_ENTERED', 
                 resource: body
              })
        },

        startEditingEan () {
            this.editingEan = true
            this.oldEan = ''
        },
        
        addSimilar () {
            this.addingSimilar = true
            this.oldEan = ''
        },

        async changeProductEan () {
            if (this.oldEan) {
                if (confirm(
                    `Deseja trocar o ean ${this.oldEan} pelo o ean ${this.newEan}`
                )) {
                    this.order = this.order.map(product => {
                        if (product[strings.ean] == this.oldEan) {
                            if (!(product[strings.found] > 0)) {
                                product[strings.ean] = String(this.newEan)
                                product[strings.eanChanged] = true
                                product.updated = true
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
            } else {
                alert('Por favor selecione um ean na tabela')
            }
        },

        confirmSimilar () {
            if (this.oldEan && this.similarDescription.length >= 10) {
                const descricao = this.order.find(p => p[strings.ean] === this.oldEan)[strings.description]
                if (confirm(
                    `Deseja adicionar o similar ${this.similarDescription} no lugar do produto ${descricao}`
                )) {
                    this.order = this.order.map(product => {
                        if (product[strings.ean] == this.oldEan) {
                            product[strings.ean] = this.newEan
                            product[strings.description] = this.similarDescription
                            product[strings.similar] = descricao
                            product.updated = true
                        }
                        return product
                    })
                    this.addingSimilar = false
                    this.notFound = false
                    this.message = 'Produto similar adicionado com sucesso, veja o resultado na tabela, bipe o próximo produto!'
                }
            } else if (!this.oldEan) {
                alert('Por favor selecione um ean na tabela')
            } else {
                alert('Por favor informa uma descrição válida (Mínimo de 10 caracteres)')
            }
        },

        async getOrder () {
            const response = await this.$GoogleAPI.api.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.$options.spreadsheet.spreadsheetId,
                range: this.$options.spreadsheet.name
            })
            
            const [ headers, ...order ] = response.result.values

            const jsonOrder = order.map(product => {
                return {
                    [headers[0]]: product[0],
                    [headers[1]]: product[1],
                    [headers[2]]: product[2],
                    [headers[3]]: product[3],
                    [headers[4]]: product[4],
                    [headers[5]]: product[5],
                    [headers[6]]: product[6],
                    [headers[7]]: product[7],
                    [headers[8]]: product[8],
                    [headers[9]]: product[9],
                }
            })
            
            return jsonOrder.map(product => {
                product[strings.amount] = Number(product[strings.amount] || '')
                product[strings.found] = Number(product[strings.found] || '')
                product[strings.orderNumber] = Number(product[strings.orderNumber] || '')
                return product
            })
        },

        async checkInputs () {
            try {
                this.order = await this.getOrder()
                this.beeping = true
                this.startTime = Date.now()
                window.onbeforeunload = function() {
                    return true;
                }
            } catch (error) {
                console.log(error)
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

        async checkEanInOrder (ean) {
            if (this.order.some(p => Number(p[strings.ean]) == ean)) { //.some -> para algum
                const produtoAchado = this.order.find(p => Number(p[strings.ean]) == ean)
                if (this.selectedUser === produtoAchado[strings.user]) { // DEVER DE CASA
                    const newOrder = []
                    this.order.forEach(product => { //.forEach -> para cada
                        const market = this.selectedMarket

                        if (`${product[strings.ean]}-${product[strings.market] || market}` == `${ean}-${market}`) {
                            this.message = `Produto "${product[strings.description]}" encontrado` //textContent -> Insere texto
                            if (!product[strings.found]) {
                                product[strings.found] = 0
                            }
                            if (product[strings.amount] > product[strings.found]) {

                                if (!product[strings.market]) {
                                    product[strings.market] = market
                                }
                                product[strings.found] += 1
                                product.updated = true
                                this.message += ` Falta(m) bipar ${Number(product[strings.amount]) - product[strings.found]} produto(s)`
                            } else {
                                this.message += ', quantidade completa, bipe o próximo produto'
                            }
                        } else if (Number(product[strings.ean])  == ean && product[strings.market] !== market && !product.hasCopy) {
                            const productCopy = Object.assign({}, product)
                            product.hasCopy = true
                            productCopy [strings.amount] = product [strings.amount] - product[strings.found]
                            product[strings.amount] = product[strings.found]
                            productCopy[strings.found] = 1
                            product.updated = true
                            productCopy.updated = true
                            productCopy[strings.market] = market
                            newOrder.push(productCopy)
                        }
                        newOrder.push(product) //.append = .push
                    })
                    this.order = newOrder
                } else {
                    alert('Esse produto não existe no seu pedido!')
                }
            } else {
                this.message = 'Produto NÃO existe no pedido, o que deseja fazer?'
                this.notFound = true
            }

            if (this.order.every(p => Number(p[strings.amount]) == p[strings.found])) {
                this.message = 'O pedido está completo'
                this.endTime = Date.now()
                if (!this.finished) {
                    await this.updateSpreadSheet(this.order)
                }
                this.finished = true
            }
        },
    }
})