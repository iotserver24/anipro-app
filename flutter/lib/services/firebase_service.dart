import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_database/firebase_database.dart';

class FirebaseService {
  static FirebaseAuth get auth => FirebaseAuth.instance;
  static FirebaseFirestore get firestore => FirebaseFirestore.instance;
  static FirebaseDatabase get database => FirebaseDatabase.instance;

  static Future<void> initialize() async {
    await Firebase.initializeApp();
  }

  static User? get currentUser => auth.currentUser;
  static bool get isSignedIn => currentUser != null;
}

