<template>
  <div>
    <el-form label-width="150px">
      <el-form-item label="文件夹路径">
        <el-input v-model="folder" placeholder="test/"></el-input>
      </el-form-item>
      <el-form-item label="选择文件">
        <el-upload
          class="upload-demo"
          drag
          action="none"
          :http-request="fileUpload"
          :on-error="uploadError"
          :on-success="uploadSuccess"
          :on-progress="uploadProgress"
          multiple>
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
  ak: 'xxxxxxxx',
  sk: 'xxxxxx',
  server: 'obs.cn-north-9.myhuaweicloud.com',
  bucketName: 'your bucketName'
}

const initConfig = {
  // 该接口作用主要告知后端，需要把当前视频转存到vod,仅在成功上传obs后调用一次
  apiObsToVod(file, data) {
    return new Promise((resolve, reject) => {
      http.post('https://xxxuploadByObs', {
        obsUrl: data.key,
        title: file.name
      }).then(res => {
        let {code, msg, data} = res.data
        if (code === 200) {
          // 成功时必须接返回下参数
          resolve({
            code: 200,
            data: {
              // vodId
              vodId: data.vodId, // 必传
              // 该视频在vod 的播放地址
              url: data.url // 非必传
            },
            msg: msg
          }, res)
        } else {
          resolve({
            code: code,
            data: data,
            msg: msg
          }, res)
        }
      }).catch(err => {
        reject(err)
      })
    })
  },
  // 是否需要vod 的播放地址。应为前端通知后端obs 转存vod 时，不一定能立即拿到vod 的播放地址。如果true, 会通过 apiVodDetails 多次尝试获取，如果不需要要vod 播放地址，则在获取到vodId 后立即响应成功，不进行多次尝试。
  needVodURL: true,
  // 改接口作用主要获取视频vod播放地址。因为obs 转存vod 不是同步的，在apiObsToVod 时可能获取不到vod 的播放地址，所以提过此接口尝试多次。在 ‘needVodURL’ 为true 时调用。会尝试 config.vodTimesLimit 次。如果尝试多次仍获取不到url,则判定上传失败。如果needVodURL 不为true 则不需要提供此参数。
  apiVodDetails(vodId, data) {
    return new Promise((resolve, reject) => {
      http.get(`https://xxxgetVideoDetail/${vodId}`).then(res => {
        let {code, msg, data} = res.data
        if (code === 200) {
          // 成功时必须接返回下参数
          resolve({
            code: 200,
            data: {
              // 该视频在vod 的播放地址。获取到url 后会立即停止重试。
              url: data.url // 非必传
            },
            msg: msg
          }, res)
        } else {
          resolve({
            code: code,
            data: data,
            msg: msg
          }, res)
        }
      }).catch(err => {
        reject(err)
      })
    })
  }
}
export default {
  name: "fixed-secret",
  data() {
    return {
      folder: ''
    }
  },
  created() {
    this.obsUpload = new ObsUpload(initOptions, initConfig)
    console.log(this.obsUpload.config);
  },
  methods: {
    fileUpload(param) {
      this.obsUpload.upload(param, {folderPath: this.folder})
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
