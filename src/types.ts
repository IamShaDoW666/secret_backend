export interface Message {
    message: string
    username: string
    time: string
    sent?: boolean
}

export interface User {
    username: string
    joined: Date
    clientId: string
}