import { protocol } from './regix'
import { isObject, isFunction } from 'lodash-es'
export const checkProtocol = (val) => {
  return protocol.test(val)
}


export const isPromise = (val) => {
  return isObject(val) && isFunction(val.then) && isFunction(val.catch)
}
