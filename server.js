var http = require("http");
var fs = require("fs");
var path = require("path");
var mime = require("mime");

var cache = {};
const hostname = '127.0.0.1';
const port = 3000;

// 错误响应
function send404(res) {
	res.statusCode = 404;
  	res.setHeader('Content-Type', 'text/plain');
	// res.writeHead(404，{'Content-Type':'text/plain'});
	res.write('Error 404: resource not found.');
	res.end();
}
// 提供文件数据服务
function sendFile(res,filePath,fileContents) {
	res.writeHead(
		200,
		{'Content-Type':mime.lookup(path.basename(filePath))});  //不一样
	res.end(fileContents);
}
// 提供静态文件
function serveStatic(res,cache,absPath) {
	if (cache[absPath]) {
		sendFile(res,absPath,cache[absPath]);
	} else {
		fs.exists(absPath, (exists)=>{
			if (exists) {
				fs.readFile(absPath, (err,data)=>{
					if (err) {
						send404(res);
					} else {
						cache[absPath] = data;
						sendFile(res,absPath,data);
					}
				});
			}else{
				send404(res);
			}
		});
	}
}
// 创建HTTP服务器
var server = http.createServer((req,res)=>{
	var filePath = false;
	if (req.url == "/") {
		filePath = 'public/index.html';
	} else {
		filePath = 'public' + req.url;
	}
	var absPath = './' + filePath;
	serveStatic(res,cache,absPath);
});
server.listen(port,hostname,()=>{
	  console.log(`Server running at http://${hostname}:${port}/`);
});
// 启动Socket.IO 
var chatServer = require("./lib/chat_server.js");
chatServer.listen(server);











