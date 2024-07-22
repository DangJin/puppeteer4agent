<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=venom&height=300&color=gradient&text=puppeteer4agent&textBg=false&animation=fadeIn&stroke=43b0cb&fontColor=43b0cb" />
  <p>基于 nodejs 运行时的截图 web 应用，快速创建并部署到阿里云函数计算 FC , 用于各种Agent的卡片生成</p>
</div>
<p align="center">
  <img alt="Version" src="https://img.shields.io/badge/version-0.1.0-blue.svg?cacheSeconds=2592000" />
  <a href="#" target="_blank">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" />
  </a>
  <a href="https://twitter.com/JinsFavorites" target="_blank">
    <img alt="Twitter: JinsFavorites" src="https://img.shields.io/twitter/follow/JinsFavorites.svg?style=social" />
  </a>
</p>

## 了解什么是函数计算
> 函数计算是事件驱动的全托管计算服务。使用函数计算，您无需采购与管理服务器等基础设施，只需编写并上传代码或镜像。函数计算为您准备好计算资源，弹性地、可靠地运行任务，并提供日志查询、性能监控和报警等功能。

更多详细文档：[快速创建函数](https://help.aliyun.com/zh/functioncompute/getting-started/quickly-create-a-function?spm=a2c4g.11186623.0.0.4694511ejhLV41)

## 开发指南：生成带文本叠加的图像截图并上传到阿里云OSS

### 1. 初始化所需依赖和阿里云OSS客户端

#### 1.1 安装依赖
首先，需要安装所需的依赖包。打开终端，进入项目目录，运行以下命令：

```bash
npm install ali-oss
```
fs puppeteer 环境已预设安装，无需再次安装

#### 1.2 引入依赖并初始化OSS客户端
在您的代码文件中，引入这些依赖并初始化阿里云OSS客户端：

```javascript
const fs = require("fs");
const puppeteer = require("puppeteer");
const OSS = require('ali-oss');

const client = new OSS({
  region: 'your region, e.g., oss-cn-beijing',
  accessKeyId: 'your accessKeyId',
  accessKeySecret: 'your accessKeySecret',
  bucket: 'your bucket name',
});
```

### 2. 定义生成截图并上传到OSS的函数

定义一个函数来生成网页截图并将其上传到阿里云OSS，另外使用此函数需要完成以下：
1. 开通OSS对象存储产品，具体操作如下：[开始使用OSS](https://help.aliyun.com/zh/oss/getting-started/getting-started-with-oss?spm=a2c4g.11186623.0.0.42397368n5PyYY)
2. 创建并获取AK/SK：[创建AccessKey](https://help.aliyun.com/zh/ram/user-guide/create-an-accesskey-pair?spm=a2c4g.11186623.0.0.603a6ecfTzAeqm)


```javascript
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
  await page.setViewport({ width: 820, height: 964 });
  await page.setContent(htmlContent);

  let path = "/tmp/example.png";
  await page.screenshot({ path: path, fullPage: true, type: "png" });
  await browser.close();

  try {
    const currentDate = new Date().getTime();
    const fileName = `${currentDate}.png`;
    const fileData = fs.createReadStream(path);

    let result = await client.putStream(fileName, fileData);
    return {
      body: result,
      headers: {
        "content-type": "application/json",
      },
      statusCode: 200,
    };
  } catch (e) {
    return {
      body: e.message,
      headers: {
        "content-type": "application/json",
      },
      statusCode: 500,
    };
  }
}
```

### 3. 处理Lambda事件，解析请求数据，生成HTML并调用截图函数

定义一个Lambda处理函数，处理传入的事件，生成HTML内容，并调用`captureScreenshot`函数：

```javascript
exports.handler = async function (event, context, callback) {
  var eventObj = JSON.parse(event.toString());
  var title = '';
  var content = '';
  var footer = '';

  if ("body" in eventObj) {
    let body = JSON.parse(eventObj.body);
    if (eventObj.isBase64Encoded) {
      body = Buffer.from(body, 'base64').toString('utf-8');
    }
    title = body['title'];
    content = body['content'];
    footer = body['footer'];
  } else {
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
      .text-overlay #title {
        font-size: 3vw;
        text-align: center;
      }
      .text-overlay #footer {
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
          <p id="title">${title}</p>
          <p id="content">${content}</p>
          <p id="footer">${footer}</p>
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
```

### 4. 返回截图上传结果

在处理函数中调用截图生成并上传的函数，并将结果返回给调用者。错误处理也包含在内，以确保在出现问题时返回适当的错误信息。

### 参考资料

1. 函数计算：[请求处理程序:Handler](https://help.aliyun.com/zh/functioncompute/user-guide/request-handlers?spm=a2c4g.11186623.0.0.156e2510e2cJb3)
2. OSS 对象存储：[开始使用OSS](https://help.aliyun.com/zh/oss/getting-started/getting-started-with-oss?spm=a2c4g.11186623.0.0.42397368n5PyYY)

### 交流学习
![puppeteer4agent](https://github.com/user-attachments/assets/08d23e47-d6bc-479c-ae14-65c2914a54a2)

