// import ObsClient from '../static/esdk-obs-browserjs-without-polyfill-3.21.8.min.js'
// import ObsClient from '../static/esdk-obs-browserjs-3.21.8.min.js'
import ObsClient from 'esdk-obs-browserjs'
import { checkProtocol } from '../utils/check'
import { cloneDeep, isFunction } from "lodash-es"
import { nanoid } from 'nanoid'
import pRetry, { AbortError } from 'p-retry'
import pAll from 'p-all'
import pWaitFor from 'p-wait-for'
import defaultConfig from "./defaultConfig"
import { createThenError } from './utils'
import { getVideoDuration, removeProtocol } from '../utils'
// const ObsClient = require('../static/esdk-obs-browserjs-without-polyfill-3.21.8.min.js')
import { version } from '../../package.json'


export default class ObsUpload {
  constructor (options, config) {
    this._init(options, config)
  }

  VERSION = version

  _init (options = {}, config = {}) {
    // 必传参数
    // const mandatoryParams = ['getAuthorization']
    // mandatoryParams.forEach(p1 => {
    //   if (!options[p1]) {
    //     console.warn(`参数: ${p1} 为必传参数`)
    //   }
    // })
    const mergeConfig = cloneDeep({ ...defaultConfig, ...config })
    if (options.bucketName) {
      this._bucketName = options.bucketName
    }

    if (mergeConfig.videoToVod) {
      if (!isFunction(config.apiObsToVod)) {
        console.warn('当需要将视频上传到vod时，apiObsToVod 方法必传，且必须反回一个promise')
      }
    }
    if (mergeConfig.needVodURL) {
      if (!isFunction(config.apiVodDetails)) {
        console.warn('当需要获取视频vod播放地址时，apiVodDetails 方法必传，且必须反回一个promise')
      }
    }
    this._options = options
    this.config = mergeConfig
  }

  _options = {}
  // client 实例
  obsClient = null

  // bucket 名称
  _bucketName = null

  // obs server
  _obsServer = null

  // token 创建时间
  _tokenCreateTime = null

  // token 存活时间 ms
  _tokenExpire = null

  // 填充server
  _fillServer (val) {
    if (checkProtocol(val) || val.startsWith('//')) {
      return val
    } else {
      return `https://${val}`
    }
  }

  // 获取上传key
  _getUploadKey (folderPath = '', fileName) {
    if (folderPath && folderPath.startsWith('/')) {
      folderPath = folderPath.slice(1)
    }
    return `${folderPath}${nanoid()}${this._getFileType(fileName)}`
  }

  // 获取文件后缀
  _getFileType (fileName = '') {
    // 后缀获取
    let suffix = ''
    try {
      if (fileName.includes('.')) {
        const fileArr = fileName.split('.') // 根据.分割数组
        suffix = fileArr[fileArr.length - 1]// 取最后一个
      }
    } catch (err) { // 如果fileName为空等.split方法会报错，就走下面的逻辑
      suffix = ''
    }
    return suffix ? `.${suffix}` : ''
  }

  getClient () {
    return new Promise((resolve, reject) => {
      const resetObs = () => {
        const options = this._options
        const obsOtherArg = ['timeout', 'is_cname', 'useRawXhr']
        const _warn = this._warn
        if (options.ak && options.sk && options.server) {
          const server = options.server
          const obsInitConfig = {
            access_key_id: options.ak,
            secret_access_key: options.sk,
            server: server
          }
          obsOtherArg.forEach(p1 => {
            if (p1 in options) {
              obsInitConfig[p1] = options[p1]
            }
          })
          // 必传参数
          const mandatoryParams = ['ak', 'sk', 'server', 'bucketName']
          mandatoryParams.forEach(p1 => {
            if (!options[p1]) {
              _warn(`参数：'${p1}' 为必传参数`)
            }
          })
          this._bucketName = options.bucketName
          this._obsServer = server
          this.obsClient = new ObsClient(obsInitConfig)
          this._tokenExpire = 0
          resolve(this.obsClient)
        } else if (options.getAuthorization) {
          options.getAuthorization({}).then((credentials, obsInstArg = {}) => {
            // 必传参数
            const mandatoryParams = ['ak', 'sk']
            mandatoryParams.forEach(p1 => {
              if (!credentials[p1]) {
                _warn(`参数：'${p1}' 为必传参数`)
              }
            })
            const server = credentials.server || this._obsServer || null
            if (!server) {
              _warn(`参数：'server' 为必传参数`)
            }
            // https://support.huaweicloud.com/sdk-browserjs-devg-obs/obs_24_0203.html
            // https://support.huaweicloud.com/bestpractice-obs/obs_05_1202.html
            // 配置;https://support.huaweicloud.com/sdk-browserjs-devg-obs/obs_24_0204.html
            const obsInitConfig = {
              access_key_id: credentials.ak,
              secret_access_key: credentials.sk,
              // security_token: credentials.securityToken,
              // https://developer.huaweicloud.com/endpoint?OBS
              server: server
            }
            this._obsServer = server
            obsOtherArg.forEach(p1 => {
              if (p1 in obsInstArg) {
                obsInitConfig[p1] = obsInstArg[p1]
              }
            })
            if (credentials.securityToken) {
              obsInitConfig.security_token = credentials.securityToken
            }
            // token 存活时间
            if (credentials.expireSeconds) {
              this._tokenExpire = credentials.expireSeconds * 1000
              this._tokenCreateTime = Date.now()
            } else {
              this._tokenExpire = -1
            }
            if (credentials.bucketName) {
              this._bucketName = credentials.bucketName
            }
            console.log('obsInitConfig')
            console.log(obsInitConfig)
            this.obsClient = new ObsClient(obsInitConfig)
            resolve(this.obsClient)
          }).catch(err => {
            reject(err)
          })
        } else {
          reject(new Error('未提供初始化参数'))
          console.warn('未提供初始化参数')
        }
      }
      if (this.obsClient) {
        // 永不过期
        if (this._tokenExpire === 0) {
          resolve(this.obsClient)
        } else if (this._tokenCreateTime && (this._tokenCreateTime + this._tokenExpire - this.config.expireRedundancy > Date.now())) {
          /***
           * 判断还没过期；加个10s 的冗余
           */
          resolve(this.obsClient)
        } else {
          this.obsClient = null
          resetObs()
        }
      } else {
        resetObs()
      }
    })
  }

  upload (param = {}, other = {}) {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      let that = this
      if (!param.file) {
        obsUploadError(new Error(`缺少必传参数：'file'`))
        return
      }
      const config = this.config
      let bucketName = null
      let key = null
      const isVideo = config.checkIsVideo(param.file)
      let obsClientObj = null
      if (config.getUploadKey) {
        try {
          key = await config.getUploadKey(param.file, other, nanoid, this._getFileType(param.file.name))
        } catch (e) {
          obsUploadError(e)
          return
        }

      } else {
        key = this._getUploadKey(other.folderPath, param.file.name)
      }
      const start = () => {
        const MAX_DIRECT_SIZE = (() => {
          const partsStrategy = config.partsStrategy
          if (partsStrategy && partsStrategy.length > 0) {
            const last = partsStrategy[partsStrategy.length - 1]
            return last.min
          }
        })()
        if (!MAX_DIRECT_SIZE || param.file.size < MAX_DIRECT_SIZE) {
          // 直传obs
          this.getClient().then(obsClient => {
            bucketName = this._bucketName
            if (!bucketName) {
              obsUploadError(new Error(`缺少必传参数：'bucketName'`))
              return
            }
            obsClientObj = obsClient
            obsClient.putObject({
              Bucket: bucketName,
              Key: key,
              SourceFile: param.file,
              // "Content-Type": '',
              ProgressCallback: (transferredAmount, totalAmount, totalSeconds) => {
                console.log('ProgressCallback')
                console.log(transferredAmount, totalAmount)
                let percent = transferredAmount / totalAmount * 100 | 0 // 百分比
                // 留5%的容量给合并视频 和获取vod 地址
                if (percent > 95) {
                  percent = 95
                }
                // param.onProgress({ percent: percent }) // 进度条
                obsUploadProgress({ percent: percent })
              }
            }, (err, result) => {
              console.log(result)
              if (err) {
                obsUploadError(err, param)
                console.error('Error-->', err)
              } else {
                if (result.CommonMsg.Status < 300) {
                  // console.timeEnd('putObject')
                  // 标记是否直传，不是分段上传
                  result.my_self_direct = true
                  result.my_self_bucketName = bucketName
                  result.my_self_key = key
                  obsUploadSuccess(result)
                } else {
                  obsUploadError(createThenError(null, result))
                }
              }
            })
          }).catch(err => {
            obsUploadError(err)
          })
        } else {
          // 分段上传obs
          fragmentUpload(param)
        }
      }
      // 上传进度
      const obsUploadProgress = (data) => {
        param.onProgress && param.onProgress(data)
      }

      // 上传出错
      function obsUploadError (err) {
        if (err.my_self_uploadId && err.my_self_key) {
          that.getClient().then(obsClient => {
            obsClient.abortMultipartUpload({
              Bucket: bucketName,
              Key: err.my_self_key,
              UploadId: err.my_self_uploadId
            })
          })
        }
        param.onError && param.onError(err)
        reject(err)
      }

      const obsUploadSuccess = (result) => {
        const obsURL = `https://${bucketName}.${removeProtocol(this._obsServer)}/${result.my_self_key}`
        result.my_slef_server = this._obsServer
        result.my_slef_data = {
          key: result.my_self_key,
          // 全路径，如果来源于vod 则是vod 全路径；如果来源于obs，则是obs 全路径
          fullUrl: obsURL,
          // fullUrl 是否来源于vod 播放地址
          isFromVod: false,
          // 保留原始obs 路径
          obsUrl: obsURL
        }
        console.log('是否是视频:', isVideo)
        console.log('result.my_slef_data')
        console.log(result.my_slef_data)
        // 要转换成vod 并且是视频格式
        if (config.videoToVod && isVideo) {
          console.log('param-33--')
          console.log(param)
          // https://github.com/broofa/mime
          // const objType = mime.getExtension(param.file.type)
          config.apiObsToVod(param.file, {
            key,
            bucketName,
            server: this._obsServer,
            obsURL
          }).then((toVodResdData = {}, toVodOther) => {
            console.log('toVodResdData')
            console.log(toVodResdData)
            let {
              data: toVodData,
              msg
            } = toVodResdData
            if (toVodData && toVodData.vodId) {
              console.log(toVodData)

              if (config.needVodURL && toVodData.url) {
                result.my_slef_data.fullUrl = toVodData.url
                result.my_slef_data.isFromVod = true
              }
              result.my_slef_data.vodId = toVodData.vodId
              result.my_slef_vod_data = toVodOther

              if (config.needVodURL && !toVodData.url) {
                if (config.vodTimesLimit === 0) {
                  // 不限次数调用，直到获取到url
                  pWaitFor(() => {
                    return new Promise((resolve, reject) => {
                      config.apiVodDetails(toVodData.vodId, {
                        key,
                        bucketName,
                        server: this._obsServer,
                        obsURL
                      }).then((vodUrlRes, otherData) => {
                        console.log('vodUrlRes')
                        console.log(vodUrlRes)
                        let vodDetailData = vodUrlRes.data
                        if (vodDetailData && vodDetailData.url) {
                          resolve(true)
                          result.my_slef_data.isFromVod = true
                          result.my_slef_data.fullUrl = vodDetailData.url
                          result.my_slef_vod_details = otherData
                          vodVideoDurationHandle(result, vodDetailData.duration)
                        } else {
                          resolve(false)
                        }
                      }).catch(err => {
                        // 网络错误，直接放弃重试
                        reject(err)
                        err.my_self_key = result.my_self_key
                        obsUploadError(err)
                      })
                    })
                  }, { interval: config.vodTimeInterval, before: false }).catch(() => {

                  })
                } else {
                  // 每1s 重试一次，尝试5次
                  pRetry(() => {
                    console.log('重试')
                    return new Promise((resolve, reject) => {
                      config.apiVodDetails(toVodData.vodId, {
                        key,
                        bucketName,
                        server: this._obsServer,
                        obsURL
                      }).then((vodUrlRes, otherData) => {
                        console.log('vodUrlRes')
                        console.log(vodUrlRes)
                        let vodDetailData = vodUrlRes.data
                        if (vodDetailData && vodDetailData.url) {
                          resolve(vodUrlRes, otherData)
                        } else {
                          setTimeout(() => {
                            reject(new Error(vodUrlRes.msg || 'vod 转码中，无法获取播放地址'))
                          }, config.vodTimeInterval)
                        }
                      }).catch(err => {
                        // 网络错误，直接放弃重试
                        reject(new AbortError(err.message))
                        // throw new AbortError(err.message)
                      })
                    })
                  }, { retries: config.vodTimesLimit }).then((retryData, detailsOtherData) => {
                    console.log('retryData')
                    console.log(retryData)
                    result.my_slef_data.isFromVod = true
                    result.my_slef_data.fullUrl = retryData.data.url
                    result.my_slef_vod_details = detailsOtherData
                    vodVideoDurationHandle(result, retryData.data.duration)
                  }).catch((err) => {
                    console.log('pRetry error', err.message)
                    console.log(err)
                    err.my_self_key = result.my_self_key
                    obsUploadError(err)
                  })
                }
              } else {
                vodVideoDurationHandle(result, toVodData.duration)
              }
            } else {
              let vodError = new Error(msg || 'obs转换vod失败')
              obsUploadError(vodError)
            }
          }).catch(err => {
            err.my_self_key = result.my_self_key
            obsUploadError(err)
          })
        } else {
          obsVideoDurationHandle(result)
        }
      }
      /**
       * obs 结果处理
       * */
      const obsVideoDurationHandle = (result) => {
        if (config.needVideoDuration && isVideo) {
          getVideoDuration(result.my_slef_data.obsUrl).then(videoRes => {
            result.my_slef_data.duration = videoRes.duration
            obsUploadProgress({ percent: 100 })
            obsUploadFormatSuccess(result)
          }).catch(err => {
            err.my_self_key = result.my_self_key
            obsUploadError(err)
          })
        } else {
          obsUploadProgress({ percent: 100 })
          obsUploadFormatSuccess(result)
        }
      }
      /**
       * vod 结果处理
       * 因为vod详情返回的视频duration 可能是0，这里前端做一下兼容处理，前端获取视频时长
       * */
      const vodVideoDurationHandle = (result, duration) => {
        if (config.needVideoDuration) {
          if (duration === 0 || !duration) {
            getVideoDuration(result.my_slef_data.obsUrl).then(videoRes => {
              result.my_slef_data.duration = videoRes.duration
              obsUploadProgress({ percent: 100 })
              obsUploadFormatSuccess(result)
            }).catch(videoErr => {
              videoErr.my_self_key = result.my_self_key
              obsUploadError(videoErr)
            })
          } else {
            result.my_slef_data.duration = duration
            obsUploadProgress({ percent: 100 })
            obsUploadFormatSuccess(result)
          }
        } else {
          obsUploadProgress({ percent: 100 })
          obsUploadFormatSuccess(result)
        }
      }

      const obsUploadFormatSuccess = (result) => {
        param.onSuccess && param.onSuccess(result)
        resolve(result)
      }

      // 分片上传
      const fragmentUpload = () => {
        this.getClient().then(obsClient => {
          bucketName = this._bucketName
          if (!bucketName) {
            obsUploadError(new Error(`缺少必传参数：'bucketName'`))
            return
          }
          obsClientObj = obsClient
          obsClient.initiateMultipartUpload({
            Bucket: bucketName,
            Key: key,
            ContentType: 'text/plain'
            // Metadata: { property: 'property-value' }
          }, (err, result) => {
            console.log('initiateMultipartUpload result')
            console.log(result)
            if (err) {
              obsUploadError(err)
              console.error('initiateMultipartUpload Error-->', err)
            } else {
              console.log('initiateMultipartUpload Status-->', result.CommonMsg.Status)
              if (result.CommonMsg.Status < 300 && result.InterfaceResult) {
                console.log('initiateMultipartUpload UploadId-->', result.InterfaceResult.UploadId)
                uploadPart(result)
              } else {
                obsUploadError(createThenError(null, result))
              }
            }
          })
        }).catch(err => {
          obsUploadError(err)
        })
      }
      const findPartConfig = (fileSize) => {
        return config.partsStrategy.find(p1 => fileSize >= p1.min)
      }
      // 上传段
      const uploadPart = (initResult) => {
        console.log('initiateMultipartUpload result-2222')
        console.log(initResult)
        let partNumber = 0
        let fileSize = param.file.size
        const partConfig = findPartConfig(fileSize)
        let partSize = partConfig.partSize
        console.log('fileSize', fileSize)
        const partsLen = Math.ceil(fileSize / partSize)
        const UploadId = initResult.InterfaceResult.UploadId
        console.log('分段数量' + partsLen)
        // const getListParts = debounce(() => {
        //   this.listParts(obsClient, param, partsLen, key, UploadId)
        // }, 1000)
        const tasks = []
        let completeNum = 0
        while (partNumber < partsLen) {
          partNumber++
          console.log('partNumber', partNumber)
          console.log('offset', (partNumber - 1) * partSize)
          ;((pNum) => {
            const taskItem = () => {
              return obsClientObj.uploadPart({
                Bucket: bucketName,
                Key: key,
                // 设置分段号，范围是1~10000
                PartNumber: pNum,
                // 设置Upload ID
                UploadId: UploadId,
                // 设置将要上传的大文件
                SourceFile: param.file,
                // 设置分段大小
                PartSize: partSize,
                // 设置分段的起始偏移大小
                Offset: (pNum - 1) * partSize
              }).then(res => {
                completeNum++
                let percent = completeNum / partsLen * 100 | 0 // 百分比
                // 留5%的容量给合并视频 和获取vod 地址
                if (percent > 95) {
                  percent = 95
                }
                // param.onProgress({ percent: percent }) // 进度条
                obsUploadProgress({ percent: percent })
                return res
              })
            }
            tasks.push(taskItem)
          })(partNumber)
        }
        // https://github.com/sindresorhus/p-all
        pAll(tasks, { concurrency: partConfig.concurrentNum }).then(res => {
          console.log('pAll res0')
          console.log(res)
          listParts(partsLen, UploadId)
        }).catch((err) => {
          err.my_self_uploadId = UploadId
          err.my_self_key = key
          obsUploadError(err)
        })
      }
      const listParts = (partsLen, uploadId) => {
        console.log('查询是否所有分片都上传完了' + key)
        obsClientObj.listParts({
          Bucket: bucketName,
          Key: key,
          UploadId: uploadId
        }, (err, result) => {
          if (err) {
            console.log('listParts Error-->', err)
            err.my_self_uploadId = uploadId
            err.my_self_key = key
            obsUploadError(err)
          } else {
            console.log('listParts Status-->' + result.CommonMsg.Status)
            if (result.CommonMsg.Status < 300 && result.InterfaceResult) {
              console.log('result.InterfaceResult.Parts')
              console.log(result.InterfaceResult.Parts)
              if (result.InterfaceResult.Parts.length === partsLen) {
                const parts = result.InterfaceResult.Parts.sort((a, b) => {
                  return a.PartNumber - b.PartNumber
                }).map(p1 => {
                  return {
                    PartNumber: p1.PartNumber,
                    ETag: JSON.parse(p1.ETag)
                  }
                })
                mergePart(parts, uploadId)
              } else {
                obsUploadError(createThenError('片段不完整', result, {
                  my_self_uploadId: uploadId,
                  my_self_key: key
                }))
              }
              // for (var i in result.InterfaceResult.Parts) {
              //   console.log('Part[' + i + ']:')
              //   // 分段号，上传时候指定
              //   console.log('PartNumber-->' + result.InterfaceResult.Parts[i]['PartNumber'])
              //   // 段的最后上传时间
              //   console.log('LastModified-->' + result.InterfaceResult.Parts[i]['LastModified'])
              //   // 分段的ETag值
              //   console.log('ETag-->' + result.InterfaceResult.Parts[i]['ETag'])
              //   // 段数据大小
              //   console.log('Size-->' + result.InterfaceResult.Parts[i]['Size'])
              // }
            } else {
              obsUploadError(createThenError(null, result, {
                my_self_uploadId: uploadId,
                my_self_key: key
              }))
            }
          }
        })
      }
      // 合并分段
      const mergePart = (parts, uploadId) => {
        console.log('parts')
        console.log(parts)
        obsClientObj.completeMultipartUpload({
          Bucket: bucketName,
          Key: key,
          // 设置Upload ID
          UploadId: uploadId,
          Parts: parts
        }, (err, result) => {
          console.log('completeMultipartUpload result-->', result)
          if (err) {
            obsUploadError(err)
            console.log('completeMultipartUpload Error-->', err)
          } else {
            if (result.CommonMsg.Status < 300) {
              // result.custom_data = {
              //   key: result.InterfaceResult.Key
              // }
              // 标记是否直传，不是分段上传
              result.my_self_direct = false
              result.my_self_key = key
              result.my_self_bucketName = bucketName
              obsUploadSuccess(result, param)
              // param.onSuccess(result)
              // console.timeEnd('fragmentUpload')
            } else {
              obsUploadError(createThenError(null, result))
            }
            console.log('completeMultipartUpload Status-->' + result.CommonMsg.Status)
          }
        })
      }
      start()
    })
  }

  _warn (text) {
    console.warn(text)
  }
}
