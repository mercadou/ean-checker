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
    vuetify: new Vuetify(),
    data: () => {
        return {
            eanInput: '',
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
            scrollTop: 0,
            snackbar: { status: false, message: '' }
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

    headers: [
        { text: strings.ean, sortable: false, value: strings.ean, },
        { text: strings.description, sortable: false, value: strings.description },
        { text: strings.category, value: strings.category },
        { text: strings.amount, sortable: false, value: strings.amount },
        { text: strings.found, sortable: false, value: strings.found},
    ],
    markets: ['MR', 'Extra', 'Atacadão', 'Guanabara'],
    users: ['Maykon', 'Jorge'],
    spreadsheet: {
        spreadsheetId: '1fMt8QRD7zVYaDR9pCKUw-ox43B1hNAMWjX_cLOKTUv4',
        name: 'Teste'
    },
    ...strings,

    created () {
        this.$vuetify.theme.dark = true
    },

    async mounted() {
        await this.$GoogleAPI.ClientLoad()
        this.$GoogleAPI.api.auth2.getAuthInstance().isSignedIn.listen((isSignedIn) => {
            this.isSignedIn = isSignedIn
        })
        this.isSignedIn = this.$GoogleAPI.api.auth2.getAuthInstance().isSignedIn.get()

        if (!this.isSignedIn) {
            this.$GoogleAPI.api.auth2.getAuthInstance().signIn()
        }
        document.addEventListener('scroll', (event) => {
            this.scrollTop = event.target.documentElement.scrollTop
        })
    },

    methods: {
        showSnackbar(message, color, timeout) {
            this.snackbar.message = message
            this.snackbar.color = color
            this.snackbar.timeout = timeout
            this.snackbar.status = true
        },

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
                                this.showSnackbar('ERRO: Esse produto não pode ser mais alterado!', 'error')
                            }
                        }
                        return product
                    })
                    this.editingEan = false
                    this.notFound = false
                    this.message = 'Ean alterado com sucesso, veja o resultado na tabela, bipe o próximo produto!'
                }
            } else {
                this.showSnackbar('Por favor selecione um ean na tabela', 'info')
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
                    this.showSnackbar('Produto similar adicionado com sucesso, veja o resultado na tabela, bipe o próximo produto!','success')
                }
            } else if (!this.oldEan) {
                this.showSnackbar('Por favor selecione um ean na tabela', 'info')
            } else {
                this.showSnackbar('Por favor informa uma descrição válida (Mínimo de 10 caracteres)', 'orange')
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
            
            return jsonOrder.map((product, index) => {
                product[strings.amount] = Number(product[strings.amount] || '')
                product[strings.found] = Number(product[strings.found] || '')
                product[strings.orderNumber] = Number(product[strings.orderNumber] || '')
                product.hasCopy = jsonOrder.filter(p => p[strings.ean] === product[strings.ean]).length > 1
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

        cancel () {
            this.addingSimilar = false
            this.editingEan = false
            this.notFound = false
            this.message = ''
        },

        checkEanInput (event) {
            const eaninput = Number(event.target.value)
            this.eanInput = ''
            if (!Number.isNaN(eaninput) && eaninput !== 0) {
                this.newEan = eaninput
                this.checkEanInOrder(eaninput)
            } else {
                this.showSnackbar('Por favor digite um EAN válido', 'orange')
            }
        },

        getEanFromTable (event) {
            this.oldEan = event.target.textContent
        },

        async checkEanInOrder (ean) {
            if (this.order.some(p => Number(p[strings.ean]) == ean)) { //.some -> para algum
                const productFound = this.order.find(p => Number(p[strings.ean]) == ean)
                const newOrder = []
                if (this.selectedUser === productFound[strings.user]) {
                    const market = this.selectedMarket
                    this.message = `Produto "${productFound[strings.description]}" encontrado` //textContent -> Insere texto
                    const eanAmount = this.order.filter(p => p[strings.ean]== ean)
                    if (eanAmount.length == 1){
                        if (!productFound[strings.found]) {
                            productFound[strings.found] = 0
                        }
                        if (productFound[strings.amount] > productFound[strings.found]) {
                            if (!productFound[strings.market]) {
                                productFound[strings.market] = market
                            }
                            productFound[strings.found] += 1
                            productFound.updated = true
                            this.message += ` Falta(m) bipar ${Number(productFound[strings.amount]) - productFound[strings.found]} produto(s)`
                        } else {
                            this.message += ', quantidade completa, bipe o próximo produto'
                        }
                    }else if (eanAmount.length > 1){
                        const pr = eanAmount.find(pr => pr[strings.found]<pr[strings.amount])
                        if (!pr[strings.found]) {
                            pr[strings.found] = 0
                        }
                        if (pr[strings.amount] > pr[strings.found]) {
                            if (!pr[strings.market]) {
                                pr[strings.market] = market
                            }
                            pr[strings.found] += 1
                            pr.updated = true 
                            const contAmount=  eanAmount.reduce((acumulador, item) => {
                                return acumulador + Number(item[strings.amount])
                                },0)
                            const contFound=  eanAmount.reduce((acumulador, item) => {
                                return acumulador + Number(item[strings.found])
                                },0)
                            this.message += ` Falta(m) bipar ${contAmount - contFound} produto(s)`  
                        } else {
                                this.message += ', quantidade completa, bipe o próximo produto'
                        }
                            
                    } else if (Number(productFound[strings.ean])  == ean && productFound[strings.market] !== market && !productFound.hasCopy) {
                        productFound.hasCopy = true
                        const productCopy = Object.assign({}, productFound)
                        productCopy [strings.amount] = productFound [strings.amount] - productFound[strings.found]
                        productFound[strings.amount] = productFound[strings.found]
                        productCopy[strings.found] = 1
                        productFound.updated = true
                        productCopy.updated = true
                        productCopy[strings.market] = market
                        newOrder.push(productCopy)
                    }
                    this.order.forEach(p => {
                        if (p[strings.ean] == productFound[strings.ean] && p[strings.orderNumber] == productFound[strings.orderNumber]){
                            newOrder.push(productFound)
                        }else{
                            newOrder.push(p)
                        }
                    })
                }
                this.order = newOrder
            } else {
                this.message = 'Produto NÃO existe no pedido, o que deseja fazer?'
                this.showSnackbar('Esse produto não existe no seu pedido!', 'orange')
                this.notFound = true
            }

            if (this.order.every(p => Number(p[strings.amount]) == p[strings.found])) {
                this.showSnackbar = ('O pedido está completo','success')
                this.endTime = Date.now()
                if (!this.finished) {
                    await this.updateSpreadSheet(this.order)
                }
                this.finished = true
            }
        },
    }
})