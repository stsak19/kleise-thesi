import { Redirect } from 'expo-router';

/* Παλιά διεύθυνση «Εμφάνιση σελίδας» (διάταξη/θέμα): πλέον η Εμφάνιση είναι ίδια με το βήμα του οδηγού
   (εξώφυλλο, φωτογραφία προφίλ, χρώμα) και ζει στις ρυθμίσεις καταστήματος. */
export default function Style() {
  return <Redirect href="/owner/setup?s=look" />;
}
