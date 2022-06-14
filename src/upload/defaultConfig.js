import {mToSize} from '../utils'


export default {
  // 过期时间冗余
  expireRedundancy: 10 * 1000,
  /**
   * 分段策略
   * 大于等于min,则使用该策略
   * */
  partsStrategy: [
    {
      min: mToSize(1024),
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
  // 检测是否为视频方法
  checkIsVideo(file) {
    let fileType = file.type
    return fileType.startsWith('video/')
  },
  // 是否将视频上传vod
  videoToVod: false,
  // 是否需要视频时长，单位s, 可能有2位小数，也有可能有3位小数
  needVideoDuration: false,
  // apiObsToVod (file, data) {
  //
  // },
  // 是否需要vod 的播放地址
  needVodURL: false,
  // apiVodDetails (vodId, data) {
  //
  // },
  // 查询vod 详情失败时，重试次数
  vodTimesLimit: 5,
  // 重试查询vod视频详情时时间间隔，单位ms
  vodTimeInterval: 1000,
  // getUploadKey (file, other, nanoId, fileType) {
  //
  // }
}
