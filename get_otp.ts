import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccount = {
    projectId: "transify-6b187",
    clientEmail: "firebase-adminsdk-fbsvc@transify-6b187.iam.gserviceaccount.com",
    privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCubw2O24e2CqL3\nfAjUWX6X10D2NJcTJnx/uBAN3nbW1Y7wwblROVxHBURnmNcUO+WA0dYUNSw9GkYk\nxOmy/3ASrbj2AcPMwLsg/sx5Cu/qVyGZfsiBL4pHjafWewO6bNKS3Y/MkZkOXpdi\nsKru7XMFHyAfwkgjTVXXCwbEeOrz1gcPBpGjeHs+/mBh1d/Tv+3STUazrd5pmd+k\nuIdbVnjATOv8wQYnRSd6yyiwO5TGgP0mytAk/JySRlckZ2gUVWbjc/cntGmQJA+f\n4neh6oWhlNgfM7D2gQXITG/8eB5T2GE2afRXMB/d1Ly7VeDz1EMODiyPpWmBpMpC\nH0mz+ibRAgMBAAECggEATLbVgSMGS+bgpjQcE/vqA3BtBvq5CHiQH4F9OgRBQpl4\nfGTOkizGawujemZLDQCMnjtqycda1eKUv74EQ684hFZ3tmWvTYDjq46zsXZAblD0\nm3OZTctxJqfjjR3b1WTftSyQ/fh4lku+i25ENsEiKTn3oFAK9s+ftWwJhWXieurG\n7H8wsZMLLx0PZOoWqtJrqYzmiroJQPxwm6kY+YVUUJ/4JSEV3SqQdMInMYWRQ6mI\nbBTgzYNB/iWJa0rD9vd1OAmr02LsYZMiq5B4VyhjCp78SK3GCHvzzoIghuGyVahm\nouxW5fYbgA38GEblpJaZ9gJu6UUJs6qOIZl9UwLlEwKBgQDmc9fzVctZ8IPe4hzN\nOcxF8RMQZ/ys2br/5BnMt+PWXwhySxxsCOxw9NnmfCDEAcDy22fbh8wYKskfPael\nFA5r9o8t0NshE/tlW1rQwXNymAQbXB2ajBUHS4DXAMGV8ifIhnsNmNUjGlKd7SMF\np+HGYSczUIyzFt7DF0w8ZQx1WwKBgQDBxWtQ4IqqdK6cm1rWwW5niyyPSYh84FSZ\nWCTvIlmzHk7x3aanYIbOBaDcEGI4Km2WnEoghwB6qDvdSOgDLzbxMfp9oQYu95h5\nLgj8uoYcF6pM6iYJpCQuUlKJSw/3tZGhn8FEeNztGneW5oI1bASMSxc4mF1yHzit\nkbmlVhFQQwKBgDtL7XH4TmWrBFNyPNT1nUEV4cDj8NkNARfcumK5ok9DjqnR99M4\njJYX+oVaxReKF/qlR9jt3S8Ou0dlluBcA8X14Ct6xReCy7ntwrVaQXln8g6UKi3d\nA4AoBlPMJwONFn17VOhPve/VUxK9tLg81VQ1JWAHxtxB8zmhogUcPxNnAoGAGyRo\nL+AEDHRjsRQh2UsnB+H6z+dg8v0JXKF4KvcI0YpBTKfbnD5tI5auPaUd3Pg0eZBS\n4dOHQacnG4wG08tdStPRXp+bmiCcfvzvzVbjSjQWasexpFAVsVdesFSPXAdW6ujR\nzaGQcLXwYnbPbmQ/DtfF3Ouay02MRuPOuVYg/rkCgYEAspwYvEtsiz+0z4E96wWM\nrQ3GdZ7sgRP80RtKchskAoeAapz6AHn+0IEKlRVeUklXY+FjirZltiIbvNHqNo+t\nCKlzNJgSm5+nA8HP00M+vueFgNRy7ihf4TxVfgTGs4t3tUipIOHZNCHnIxBiqvQP\n9SdpuV2LRZAFls+2NtArW8o=\n-----END PRIVATE KEY-----\n".replace(/\\n/g, "\n"),
};

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app, "transifydb");

async function getOtp() {
    const email = "admin@dps-blr.edu.in";
    try {
        const doc = await db.collection("otp_codes").doc(email.toLowerCase()).get();
        if (doc.exists) {
            console.log("OTP_FOUND:" + doc.data()?.otp);
        } else {
            console.log("OTP_NOT_FOUND");
        }
    } catch (error) {
        console.error("Error fetching OTP:", error);
    }
}

getOtp();
