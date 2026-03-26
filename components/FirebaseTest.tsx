import { db, auth } from "@/lib/firebase"; // adjust path as needed
import { collection, getDocs, limit, query } from "firebase/firestore";
 
export const FirebaseStatusCheck = () => {
    const checkConnection = async () => {
        try {
            console.log("Checking Firebase Status...");
            // 1. Test Firestore Connection to transifydb
            const orgRef = collection(db, "organizations");
            const q = query(orgRef, limit(1));
            await getDocs(q);
            alert("✅ Firestore Connected to 'transifydb' successfully!");
 
            // 2. Test Auth Initialization
            if (auth.app.options.apiKey === "AIzaSyDlUuJeaur7dU3_o2psx7dYL8iwjBpeNCQ") {
                alert("✅ Auth Keys match your new Google Services JSON!");
            } else {
                alert("❌ Auth Keys still using the old Web credentials!");
            }
 
        } catch (error: any) {
            console.error("Connection Failed:", error);
            alert(`❌ Error: ${error.message}\nCheck your SHA-1 and google-services.json!`);
        }
    };
 
    return (
<button 
            onClick={checkConnection}
            className="p-3 bg-blue-600 text-white rounded-lg m-4 shadow-lg active:bg-blue-800"
>
            Test Firebase Link
</button>
    );
};