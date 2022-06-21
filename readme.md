# obs-upload

- 支持固定ak,sk，异步获取固定ak,sk或者临时ak,sk,token
- 临时token，未过期不重新获取，过期前自动重新获取。
- vod 上传
- vod 详情获取重试机制
- 基于nanoId 生成上传key,可自定义key

## 安装
### npm

````js
npm install obs-upload -S
````
#### import
```` js
import ObsUpload from 'obs-upload'
````

如果你需要华为sdk原本的 `ObsClient`
```` js
import { ObsClient } from 'obs-upload'
````


#### require
```` js
const { default: ObsUpload, ObsClient } = require('obs-upload');
````

## 使用
### 初始化

```` js
const obsUpload = new ObsUpload(initOptions, initConfig)
````

#### initOptions

##### 可选参数

```` js
{
    // 可选
    ak: '',
    // 可选
    sk: '',
    // 可选
    // https://developer.huaweicloud.com/endpoint?OBS
    server: 'obs.cn-east-2.myhuaweicloud.com',
    // 可选
    bucketName: '',
    // 异步获取ak,sk。
    getAuthorization(options) {
      return new Promise((resolve, reject) => {
        http.post('https://xxx.com/api/getObsToken').then(res => {
          let resData = res.data.data
          // resolve 时接收以下字段。
          resolve({
            // 可以是临时ak,也可是是固定ak
            ak: resData.ak,
            // 可以是临时sk,也可以是固定sk
            sk: resData.sk,
            // 可选；如果是临时秘钥，此参数必传
            securityToken: resData.securityToken,
            // https://developer.huaweicloud.com/endpoint?OBS
            // 如果上边传了，此处不必传。优先使用此值
            // server: resData.endPoint,
            // 如果上边传了，此处不必传。优先使用此值
            // bucketName: resData.bucketName,
            // 可选；token 存活时间，相对时间，单位秒。非必传。如果securityToken 过期，则会重新调用getAuthorization 获取临时秘钥token 等参数。比如token 存活时间5分钟，则此值为 300(5*60)。如果不传且为临时秘钥，则每次上传都会重新获取securityToken; 如何expireSeconds 为0，则表示ak,sk 永久有效，不会重新获取。如果ak,sk 为固定秘钥，则expireSeconds 应接收0，表示永久有效。
            expireSeconds: resData.durationSeconds
          })
        }).catch(err => {
          // 失败时只接受Error 对象
          reject(err)
        })
      })
    }
}
````

#### initConfig

##### 默认值

```` js
{
  // 过期时间冗余。单位ms.如果原本token 20s后过期，此值让token,提前10s过期；
  expireRedundancy: 10 * 1000,
  /**
   * 分段策略。按照min从大到小排列。
   * min: Number 类型，单位kb,当前文件的size大于等于当前min,则使用该策略
   * concurrentNum: 段上传时的并发数。
   * 如果当前文件的size 大于等于partsStrategy 的最后一个策略的min,则使用分段上传，否则直接上传。如果partsStrategy不存在，或者为空数组，则所有文件都直接上传，不使用分段上传。
   * */
  partsStrategy: [
    {
      min: mToSize(1024), // 单位kb
      partSize: mToSize(20), // 每段大小
      concurrentNum: 10 // 并发数
    },
    {
      min: mToSize(512),
      partSize: mToSize(20),
      concurrentNum: 10 // 并发数
    },
    {
      min: mToSize(200),
      partSize: mToSize(15),
      concurrentNum: 10 // 并发数
    },
    {
      min: mToSize(100),
      partSize: mToSize(10),
      concurrentNum: 10 // 并发数
    }
  ],
  // 检测是否为视频方法。用户自定义检测方法。返回 Boolean 类型。
  checkIsVideo(file) {
    let fileType = file.type
    return fileType.startsWith('video/')
  },
  // 是否将视频上传vod
  videoToVod: false,
  // 是否需要视频时长，单位s, 可能有2位小数，也有可能有3位小数
  needVideoDuration: false,
  // 通知obs 转存vod。需要返回vodId
  // apiObsToVod (file, data) {
  //
  // },
  // 是否需要vod 的播放地址。如果为false,则在apiObsToVod 返回vodId 时响应成功。否则继续调用apiVodDetails 获取vod 详情
  needVodURL: false,
   // 查询vod 详情，需要返回url。因为vod 转码是异步的，可能obs已经转存vod,但是转码中，此时获取不到vod 的播放url。
  // apiVodDetails (vodId, data) {
  //
  // },
  // 查询vod 详情失败时，重试次数; 0为无限次，直到查询到url，才会停止查询。
  vodTimesLimit: 0,
  // 重试查询vod视频详情时时间间隔，单位ms。也可以是一个函数。
  vodTimeInterval: 1000,
  // 可直接返回key,也可返回一个promise，接收key
  // getUploadKey (file, other, nanoId, fileType) {
  //
  // }
}

````

**apiObsToVod**

```` js
 // 该接口作用主要告知后端，需要把当前视频转存到vod,仅在成功上传obs后调用一次
 /***
 https://support.huaweicloud.com/api-vod/vod_04_0201.html
 https://support.huaweicloud.com/api-vod/vod_04_0051.html
 */
  apiObsToVod(file, data) {
    return new Promise((resolve, reject) => {
      const videoType = file.type.split('/')[1]
      // 获取媒资Id
      http.post('https://xxx.com/api/getAssetId', {
        object: data.key,
        title: file.name,
        videoType: videoType.toUpperCase()
      }).then(res => {
        let {code, msg, data} = res.data
        if (code === "200" && data) {
          console.log(data);
          // 成功时必须接返回下参数
          resolve({
            data: {
              // vodId
              vodId: data, // 必传
              // 该视频在vod 的播放地址
              // url: data.url // 非必传
            },
            // 需要携带的自定义参数。上传成功后 obs_upload_vod_data 字段体现。
            otherData: data
          })
        } else {
          // 内部判断 data.vodId 不存在，则认定上传失败。msg 可传可不传，表示上传失败时 error.message 。
          resolve({
            data: data,
            msg: msg
          })
        }
      }).catch(err => {
        // 如果接收 reject 则会判断上传失败。注意reject 应始终只接收一个Error 对象
        reject(err)
      })
    })
  }
````



**apiVodDetails**

```` js
// 该接口作用主要获取视频vod播放地址。因为obs 转存vod 不是同步的，在apiObsToVod 时可能获取不到vod 的播放地址，所以通过此接口尝试多次。在 ‘needVodURL’ 为true 时调用。会尝试 config.vodTimesLimit 次。如果尝试config.vodTimesLimit次后仍获取不到url,则判定上传失败。如果needVodURL 不为true 则不需要提供此参数。
// https://support.huaweicloud.com/api-vod/vod_04_0202.html
  apiVodDetails(vodId, data) {
    return new Promise((resolve, reject) => {
      http.post(`https://xxx.com/api/getAssetDetail`, {assetId: vodId}).then(res => {
        let {code, msg, data} = res.data
        // https://support.huaweicloud.com/api-vod/vod_04_0202.html
        // 截图失败，不再重试
        //if (data && data.thumbnailStatus === 'THUMBNAIL_FAILED') {
        //  reject(new Error('截图失败'))
        //  return
        //}
   
        if (code === "200" && data) {
          // 成功时必须接返回下参数
          resolve({
            data: {
              // 该视频在vod 的播放地址。获取到url 后会立即停止重试。
              url: data.videoUrl // 非必传
            },
            // 需要携带的自定义参数。上传成功后 obs_upload_vod_details 字段体现。
            otherData: data,
            msg: msg
          })
        } else {
          // 当前还没有url,会继续进行重试。
          resolve({
            data: data,
            otherData: data,
            msg: msg // msg 可传可不传，表示上传失败时 error.message 。
          })
        }
      }).catch(err => {
        // 如果接收 reject 则会停止重试。注意reject 应始终只接收一个Error 对象
        reject(err)
      })
    })
  }
````



**vodTimeInterval**



重试查询vod视频详情时时间间隔，单位ms。也可以是一个函数。



```` js
  /**
   * file
   * data {
   *      key,
   *      bucketName,
   *      server,
   *      obsURL,
   *      vodId
   *    }
   * */
  vodTimeInterval(file, data) {
    const mToSize = (num) => {
      return num * 1024 * 1024
    }
    const fileSize = file.size
    if (fileSize > mToSize(200)) {
      return 3 * 1000
    } else if (fileSize > mToSize(200)) {
      return 2 * 1000
    } else {
      return 1000
    }
  }
````





**getUploadKey**

自定义上传文件key



返回上传的文件key。可使用普通函数 或者Promise.

```` js
  /**
   * @param file - file 文件
   * @param {Object} other - upload 传的第二个参数
   * @param {Function} nanoId - nanoid 唯一id 生成函数
   * @param {String} fileType - 文件后缀，带.  例如：.png  .mp4
   * @return {String} 上传文件的key
   * */
  getUploadKey(file, other, nanoId, fileType) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(`${other.folderPath}2022-06-18/${nanoId()}/${Date.now()}${fileType}`)
      }, 1500)
    })
  }
````



*注意：不建议文件路径中出现中文或者特殊字符；可考虑使用 `encodeURIComponent` 处理*



### Methods

#### upload

```` js
obsUpload.upload({
    // 必传；file 对象
    file: file,
    // 成功触发；可选；
    onSuccess (result) {
        
    },
    // 上传进度更新；可选；
    onProgress (data) {
       
    },
    // 上传失败。可选；error Error 对象
    onError (error) {
        
    }
}, {
    // 上传文件的文件夹路径；非必传
    folderPath: 'test/'
})
````



upload返回一个Promise



```` js
obsUpload.upload({file}).then().catch()
````



#### getClient

获取client 实例，Promise

```` js
obsUpload.getClient().then(obsClient => {
    
}).catch()
````

### 属性

#### obsClient

当前obsUpload 实例的 obsClient。不存在时为null.

```` js
obsUpload.obsClient
````



#### VERSION

当前插件的版本号

```` js
obsUpload.VERSION
````



## 常见问题

[常见问题](./docs/questions.md)
