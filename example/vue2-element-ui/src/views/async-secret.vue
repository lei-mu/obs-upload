<template>
  <div>
    <el-form label-width="150px">
      <el-form-item label="文件夹路径">
        <el-input v-model="folder" placeholder="test/"></el-input>
      </el-form-item>
      <el-form-item label="选择文件">
        <el-upload class="upload-demo" drag action="none" :http-request="fileUpload" :on-error="uploadError"
          :on-success="uploadSuccess" :on-progress="uploadProgress" multiple>
          <i class="el-icon-upload"></i>
          <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
          <div class="el-upload__tip" slot="tip">只能上传jpg/png文件，且不超过500kb</div>
        </el-upload>
      </el-form-item>
    </el-form>

  </div>
</template>

<script>
import ObsUpload from 'obs-upload'
import axios from 'axios'

const http = axios.create()

const initOptions = {
  // server: 'obs.cn-north-9.myhuaweicloud.com',
  // bucketName: 'your bucketName'
  getAuthorization(options) {
    return new Promise((resolve, reject) => {
      http.get('https://xxx/getToken').then(res => {
        let resData = res.data.data
        resolve({
          // 可以是临时ak,也可是是固定ak
          ak: resData.ak,
          // 可以是临时sk,也可以是固定sk
          sk: resData.sk,
          // 如果是临时秘钥，此参数必传
          securityToken: resData.token,
          // 如果上边传了，此处不必传。优先使用此值
          server: resData.endPoint,
          // 如果上边传了，此处不必传。优先使用此值
          bucketName: resData.bucketName,
          // token 存活时间，相对时间，单位秒。非必传。如果securityToken 过期，则会重新调用getAuthorization 获取临时秘钥token 等参数。比如token 存活时间5分钟，则此值为 300(5*60)。如果不传且为临时秘钥，则每次上传都会重新获取securityToken
          expireSeconds: resData.expireSeconds
        })
      }).catch(err => {
        // 失败时只接受Error 对象
        reject(err)
      })
    })
  }
}

const initConfig = {
  // 该接口作用主要告知后端，需要把当前视频转存到vod,仅在成功上传obs后调用一次
  apiObsToVod(file, data) {
    return new Promise((resolve, reject) => {
      http.post('https://xxx/uploadByObs', {
        obsUrl: data.key,
        title: file.name
      }).then(res => {
        let { code, msg, data } = res.data
        if (code === 200) {
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
  },
  // 是否将视频格式上传到vod。默认false
  videoToVod: true,
  // 是否需要vod 的播放地址。应为前端通知后端obs 转存vod 时，不一定能立即拿到vod 的播放地址。如果true, 会通过 apiVodDetails 多次尝试获取，如果不需要要vod 播放地址，则在获取到vodId 后立即响应成功，不进行多次尝试。
  needVodURL: true,
  // 该接口作用主要获取视频vod播放地址。因为obs 转存vod 不是同步的，在apiObsToVod 时可能获取不到vod 的播放地址，所以通过此接口尝试多次。在 ‘needVodURL’ 为true 时调用。会尝试 config.vodTimesLimit 次。如果尝试config.vodTimesLimit次后仍获取不到url,则判定上传失败。如果needVodURL 不为true 则不需要提供此参数。
  // https://support.huaweicloud.com/api-vod/vod_04_0202.html
  apiVodDetails(vodId, data) {
    return new Promise((resolve, reject) => {
      http.get(`https://xxx/getVideoDetail/${vodId}`).then(res => {
        let { code, msg, data } = res.data
        if (code === 200) {
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
        reject(err)
      })
    })
  }
}
export default {
  name: "async-secret",
  data() {
    return {
      folder: ''
    }
  },
  created() {
    this.obsUpload = new ObsUpload(initOptions, initConfig)
  },
  methods: {
    fileUpload(param) {
      this.obsUpload.upload(param, { folderPath: this.folder })
    },
    uploadError(err, file) {
      console.log('uploadError');
      console.log(err, file);
    },
    uploadSuccess(result, file, fileList) {
      console.log('uploadSuccess');
      console.log(result, file, fileList);
    },
    uploadProgress(data) {
      console.log('uploadProgress');
      console.log(data);
    }
  }
}
</script>

<style scoped>
</style>
