


export const mToSize = (num) => {
  return num * 1024 * 1024
}


/**
 * 获取视频基础信息
 * duration 视频时长，单位秒
 * */
export const getVideoDuration = (url) => {
  return new Promise((resolve, reject) => {
    let video = document.createElement('video')
    video.preload = 'metadata'
    video.src = url
    video.onloadedmetadata = () => {
      resolve({
        duration: video.duration
      })
      video = null
    }
    video.onerror = () => {
      reject(new Error('视频加载失败'))
      video = null
    }
  })
}


/**
 * 删除协议
 * */
export const removeProtocol = val => {
  if (!val) return ''
  const arr = val.split('//')
  return arr.pop()
}
