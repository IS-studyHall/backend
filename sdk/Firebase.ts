import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { app, adminApp } from "../config/firebase";
import { FirebaseLogin, FirebaseVerifyToken, Result } from './types';

class Firebase{
    auth: any
    constructor() {
        this.auth = getAuth(app)
    }

    async login(email:string, password:string): Promise<Result<FirebaseLogin> | undefined>{
        try{
            const { user } = await signInWithEmailAndPassword(this.auth, email, password)
            const result = {
                data: {
                    token: await user.getIdToken(),
                    refreshToken: user.refreshToken,
                    user: user
                }
            }
            return result
        }catch(e){
            return undefined
        }
    }

    async verifyToken(token: string): Promise<Result<FirebaseVerifyToken> | undefined> {
        try{
            const {email} = await adminApp.auth().verifyIdToken(token)
            const result = {
                data: {
                    email: email
                }
            }
            return result
        }catch(e){
            return undefined
        }
    }
}

export default new Firebase()