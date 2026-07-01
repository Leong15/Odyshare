export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

const isDev = process.env.NODE_ENV !== 'production'

function formatMessage(level: LogLevel, label: string, message: string): string {
  const time = new Date().toISOString().slice(11, 19)
  return `[${time}][${level.toUpperCase()}][${label}] ${message}`
}

export function createLogger(label: string) {
  return {
    info:  (msg: string, ...args: any[]) => console.log(formatMessage('info', label, msg), ...args),
    warn:  (msg: string, ...args: any[]) => console.warn(formatMessage('warn', label, msg), ...args),
    error: (msg: string, ...args: any[]) => console.error(formatMessage('error', label, msg), ...args),
    debug: (msg: string, ...args: any[]) => { if (isDev) console.log(formatMessage('debug', label, msg), ...args) },
  }
}
