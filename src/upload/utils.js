/**
 * 生成then 情况下非成功的error
 * */
export const createThenError = (errorMsg, result, other = {}) => {
  console.log('createThenError')
  console.log(result)
  const error = new Error(errorMsg || result.CommonMsg.Message)
  // 自定义生成 Error 标识
  error.isThenError = true
  error.result = result
  Object.keys(other).forEach(p1 => {
    error[p1] = other[p1]
  })
  error.toJSON = () => {
    return {
      result,
      isThenError: true,
      ...other
    }
  }
  return error
}
