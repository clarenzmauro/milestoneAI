// src/services/firestoreService.ts
import { firestore } from '../firebaseConfig';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  Timestamp, // Import Timestamp type if needed for comparisons or display
  orderBy,
  writeBatch // Import writeBatch
} from 'firebase/firestore';
import { FullPlan } from '../types/planTypes'; // Assuming your FullPlan type is defined here
import { ChatMessage } from '../types/chatTypes'; // Import shared ChatMessage type

// --- Firestore Service Functions --- 

// Type definition for the plan data stored in Firestore
interface PlanDocument extends FullPlan {
  userId: string;
  createdAt: Timestamp; // Ensure Firestore Timestamp is used
  chatHistory?: ChatMessage[]; // Optional: Store chat history
  interactionMode?: 'plan' | 'chat'; // Optional: Store the mode ('plan' or 'chat')
}

// Type definition for plan data returned with Firestore ID
export type PlanWithId = PlanDocument & { id: string };

/**
 * Saves a new plan document to Firestore under the specific user's subcollection.
 * @param userId - The authenticated user's ID.
 * @param dataToSave - The plan data to save, including optional chat history and interaction mode.
 * @returns The ID of the newly created plan document.
 */
export const savePlan = async (userId: string, dataToSave: Partial<PlanDocument>): Promise<string> => {
  if (!userId) throw new Error("User must be logged in to save a plan.");
  if (!dataToSave || !dataToSave.goal) throw new Error("Plan data is invalid.");

  try {
    // Reference to the user's specific 'plans' subcollection
    const userPlansCollectionRef = collection(firestore, 'users', userId, 'plans');
    
    // Add the plan as a new document
    const docRef = await addDoc(userPlansCollectionRef, {
      ...dataToSave, // Save all provided data (plan, history, mode)
      userId: userId,
      createdAt: serverTimestamp() // Use server timestamp for consistency
    });

    console.log('Plan saved successfully with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error saving plan to Firestore:", error);
    throw new Error(`Failed to save plan: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Retrieves all plans saved by a specific user, ordered by goal (ascending) and creation date (newest first).
 * @param userId - The authenticated user's ID.
 * @returns A promise that resolves to an array of plan objects, each including its Firestore document ID.
 */
export const getUserPlans = async (userId: string): Promise<(PlanWithId)[]> => {
  if (!userId) throw new Error("User ID is required to fetch plans.");

  try {
    const userPlansCollectionRef = collection(firestore, 'users', userId, 'plans');
    // Query to get plans ordered by goal (ascending) and creation time (descending)
    const q = query(
      userPlansCollectionRef, 
      orderBy('goal'), 
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);

    const plans: PlanWithId[] = [];
    querySnapshot.forEach((doc) => {
      // Combine document data with its ID
      const data = doc.data() as PlanDocument;
      plans.push({ ...data, id: doc.id });
    });

    console.log(`Fetched ${plans.length} plans for user ${userId}`);
    return plans;
  } catch (error) {
    console.error("Error fetching user plans from Firestore:", error);
    throw new Error("Failed to fetch plans.");
  }
};

/**
 * Deletes a specific plan document from Firestore.
 * @param userId - The authenticated user's ID.
 * @param planId - The ID of the plan document to delete.
 * @returns A promise that resolves when the deletion is complete.
 */
export const deletePlan = async (userId: string, planId: string): Promise<void> => {
  if (!userId || !planId) throw new Error("User ID and Plan ID are required to delete a plan.");

  try {
    // Reference to the specific plan document within the user's subcollection
    const planDocRef = doc(firestore, 'users', userId, 'plans', planId);

    await deleteDoc(planDocRef);

    console.log(`Plan with ID ${planId} deleted successfully for user ${userId}.`);
  } catch (error) {
    console.error("Error deleting plan from Firestore:", error);
    throw new Error("Failed to delete plan.");
  }
};

/**
 * Deletes all plan documents associated with a specific goal for a user.
 * @param userId - The authenticated user's ID.
 * @param goal - The goal string to match for deletion.
 * @returns A promise that resolves when the batch deletion is complete.
 */
export const deletePlansByGoal = async (userId: string, goal: string): Promise<void> => {
  if (!userId || !goal) throw new Error("User ID and Goal are required for batch deletion.");

  try {
    const userPlansCollectionRef = collection(firestore, 'users', userId, 'plans');
    // Query for documents matching the userId and the specific goal
    const q = query(userPlansCollectionRef, where('userId', '==', userId), where('goal', '==', goal));

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log(`No plans found with goal "${goal}" for user ${userId} to delete.`);
      return; // Nothing to delete
    }

    // Create a batch
    const batch = writeBatch(firestore);

    // Add each document deletion to the batch
    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Commit the batch
    await batch.commit();

    console.log(`Successfully deleted ${querySnapshot.size} plans with goal "${goal}" for user ${userId}.`);

  } catch (error) {
    console.error("Error batch deleting plans by goal from Firestore:", error);
    throw new Error("Failed to batch delete plans by goal.");
  }
};

// Optional: Add getPlanById if needed later
// export const getPlanById = async (userId: string, planId: string): Promise<(FullPlan & { id: string }) | null> => { ... }
