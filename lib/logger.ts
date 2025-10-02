export class Logger {
  static log(message: string) {
    if (__DEV__) {
      console.log(message)
    }
  }
}