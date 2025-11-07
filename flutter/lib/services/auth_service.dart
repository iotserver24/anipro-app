import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'firebase_service.dart';

class AuthService {
  final FirebaseAuth _auth = FirebaseService.auth;
  final FirebaseFirestore _firestore = FirebaseService.firestore;

  User? get currentUser => _auth.currentUser;
  bool get isSignedIn => currentUser != null;

  Stream<User?> get authStateChanges => _auth.authStateChanges();

  Future<UserCredential?> signInWithEmailAndPassword(
      String email, String password) async {
    try {
      final credential = await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
      return credential;
    } catch (e) {
      print('Sign in error: $e');
      return null;
    }
  }

  Future<UserCredential?> registerWithEmailAndPassword({
    required String email,
    required String password,
    required String username,
    String? birthdate,
  }) async {
    try {
      final credential = await _auth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );

      // Create user document in Firestore
      if (credential.user != null) {
        await _firestore.collection('users').doc(credential.user!.uid).set({
          'email': email,
          'username': username,
          'birthdate': birthdate,
          'avatarId': 'default',
          'createdAt': FieldValue.serverTimestamp(),
          'emailVerified': false,
          'isPremium': false,
          'donationAmount': 0,
        });

        // Send verification email
        await credential.user!.sendEmailVerification();
      }

      return credential;
    } catch (e) {
      print('Registration error: $e');
      return null;
    }
  }

  Future<void> signOut() async {
    await _auth.signOut();
  }

  Future<bool> sendPasswordResetEmail(String email) async {
    try {
      await _auth.sendPasswordResetEmail(email: email);
      return true;
    } catch (e) {
      print('Password reset error: $e');
      return false;
    }
  }

  Future<bool> sendEmailVerification() async {
    try {
      await currentUser?.sendEmailVerification();
      return true;
    } catch (e) {
      print('Email verification error: $e');
      return false;
    }
  }

  Future<bool> reloadUser() async {
    try {
      await currentUser?.reload();
      return true;
    } catch (e) {
      return false;
    }
  }

  bool get isEmailVerified => currentUser?.emailVerified ?? false;
}

