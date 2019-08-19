const http = require('http')
const fs = require('fs')
const port = process.env.PORT || '2611'

const server = http.createServer((req, res) => {
    if (req.method === 'GET') {

        if (req.url === '/') {
            var html = fs.readFileSync('./public/index.html', 'utf8')
            res.writeHead(200, {'Content-Type': 'text/html' })
            res.end(html)
        } else if (req.url.includes('/js/')) {
            try {
                const file = fs.readFileSync(`./public${req.url}`)
                res.writeHead(200, {'Content-Type': 'text/javascript' })
                res.end(file, undefined)
            } catch (error) {
                console.log(error)
                res.writeHead(404)
                res.end('Resource Not Found')
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
