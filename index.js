const http = require('http')
const fs = require('fs')
const port = '8000'

const server = http.createServer((req, res) => {
    if (req.method === 'GET') {

        if (req.url === '/') {
            var html = fs.readFileSync('./public/index.html', 'utf8')
            res.writeHead(200, {'Content-Type': 'text/html' })
            res.end(html)
        } else if (req.url === '/js/app.js') {
            try {
                const file = fs.readFileSync('./public/js/app.js')
                res.writeHead(200, {'Content-Type': 'text/javascript' })
                res.end(file, undefined)
            } catch (error) {
                console.log(error)
            }
        } else {
            res.writeHead(404)
            res.end('Resource Not Found')
        }

    } else {
        res.writeHead(404)
        res.end('Resource Not Found')
    }
})

server.listen(port, () => {
    console.log(`Servidor online! http://localhost:${port}`)
})