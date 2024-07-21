const fs = require("fs");
const puppeteer = require("puppeteer");
const OSS = require('ali-oss');

const client = new OSS({
  region: ' your region, oss-cn-beijing',
  accessKeyId: 'your accessKeyId',
  accessKeySecret: 'your accessKeySecret',
  bucket: 'your bucket name',
});

async function captureScreenshot(htmlContent) {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-setuid-sandbox",
      "--no-first-run",
      "--no-zygote",
      "--no-sandbox",
    ],
  });
  const page = await browser.newPage();

  // 设置视口大小
  await page.setViewport({ width: 820, height: 964 });

  // 设置页面内容
  await page.setContent(htmlContent);

  let path = "/tmp/example";
  await page.screenshot({ path: path, fullPage: true, type: "png" });
  await browser.close();


  try {

    const currentDate = new Date().getTime();

    // 生成文件名
    const fileName = `${currentDate}.png`;

    console.log(fileName); // 输出格式为 YYYYMMDD，例如 20240717

    const fileData = fs.createReadStream(path);

    let result = await client.putStream(fileName, fileData);

    console.log(result);
    return {
      body: result,
      headers: {
        "content-type": "application/json",
      },
      statusCode: 200,
    }
  } catch (e) {
    console.log(e)
    return {
      body: e.message,
      headers: {
        "content-type": "application/json",
      },
      statusCode: 500,
    }
  }
}

exports.handler = async function (event, context, callback) {
  var eventObj = JSON.parse(event.toString());
  var title = '';
  var content = '';
  var footer = '';

  // get http request body
  if ("body" in eventObj) {
    body = JSON.parse(eventObj.body);
    if (eventObj.isBase64Encoded) {
      body = Buffer.from(body, 'base64').toString('utf-8');
    }
    title = body['title'];
    content = body['content'];
    footer = body['footer'];

  } else {
    console.log("else:---->",event);
    title = eventObj['title'];
    content = eventObj['content'];
    footer = eventObj['footer'];
  }

  const htmlContent = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Add Text to Image</title>
    <link rel="stylesheet" href="//unpkg.com/heti/umd/heti.min.css">
    <style>
      .image-container {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        max-width: 800px;
        margin: 0 auto;
      }
  
      .image-container img {
        width: 100%;
        height: auto;
        display: block;
      }
  
      .text-overlay {
        position: absolute;
        color: rgb(0, 0, 0);
        font-size: 2vw;
        font-family: Arial, sans-serif;
        padding: 1vw;
        text-align: center;
        transform: rotate(6deg);
        max-width: 60%;
        top: 25%;
      }
      .text-overlay #title{
        font-size: 3vw;
        text-align: center;
      }
  
      .text-overlay #footer{
        text-align: right;
      }
  
      @media (max-width: 600px) {
        .text-overlay {
          font-size: 4vw;
          padding: 2vw;
        }
      }
    </style>
  </head>
  
  <body>
    <div class="image-container">
      <img src="https://telegraph-image.pages.dev/file/36594230fcca22c0480b9.jpg" alt="Image">
      <div class="text-overlay">
        <article class="entry heti heti--poetry">
          <p id="title">
          ${title}
          </p>
          <p id="content">
          ${content}
          </p>
          <p id="footer">
          ${footer}
          </p>
        </article>
      </div>
      
    </div>
  </body>
  <script src="//unpkg.com/heti/umd/heti-addon.min.js"></script>
  <script>
    const heti = new Heti('.heti');
    heti.autoSpacing();
  </script>
  </html>
  `;
  try {
    const ret = await captureScreenshot(htmlContent);
    callback(null, ret);
  } catch (err) {
    callback(null, {
      body: err.message,
      headers: {
        "content-type": "application/json",
      },
      statusCode: 500,
    });
  }
};
