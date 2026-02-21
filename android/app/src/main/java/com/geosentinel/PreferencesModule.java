package com.geosentinel;

import android.content.Context;
import android.content.SharedPreferences;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

public class PreferencesModule extends ReactContextBaseJavaModule {
    // Nom du fichier partagé entre JS et le service
    public static final String PREFS_NAME = "LocationServicePrefs";
    public static final String KEY_TASK_INTERVAL = "taskInterval";
    public static final String KEY_TOURNEE_TYPE = "tourneeType";
    // ✅ Clés pour les tokens JWT (partagés avec le background task)
    public static final String KEY_ACCESS_TOKEN = "accessToken";
    public static final String KEY_REFRESH_TOKEN = "refreshToken";
    
    public PreferencesModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }
    
    @Override
    public String getName() {
        return "PreferencesModule";
    }
    
    @ReactMethod
    public void setTaskInterval(int interval, Promise promise) {
        try {
            SharedPreferences prefs = getReactApplicationContext()
                .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            
            prefs.edit()
                .putInt(KEY_TASK_INTERVAL, interval)
                .apply();
            
            android.util.Log.d("PreferencesModule", "✅ taskInterval sauvegardé: " + interval + "ms");
            promise.resolve(true);
        } catch (Exception e) {
            android.util.Log.e("PreferencesModule", "❌ Erreur sauvegarde interval", e);
            promise.reject("ERROR", e.getMessage());
        }
    }
    
    @ReactMethod
    public void setTourneeType(String type, Promise promise) {
        try {
            SharedPreferences prefs = getReactApplicationContext()
                .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            
            prefs.edit()
                .putString(KEY_TOURNEE_TYPE, type)
                .apply();
            
            android.util.Log.d("PreferencesModule", "✅ tourneeType sauvegardé: " + type);
            promise.resolve(true);
        } catch (Exception e) {
            android.util.Log.e("PreferencesModule", "❌ Erreur sauvegarde type", e);
            promise.reject("ERROR", e.getMessage());
        }
    }
    
    @ReactMethod
    public void getTaskInterval(Promise promise) {
        try {
            SharedPreferences prefs = getReactApplicationContext()
                .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            
            int interval = prefs.getInt(KEY_TASK_INTERVAL, 60000);
            promise.resolve(interval);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }
    
    @ReactMethod
    public void getTourneeType(Promise promise) {
        try {
            SharedPreferences prefs = getReactApplicationContext()
                .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            
            String type = prefs.getString(KEY_TOURNEE_TYPE, null);
            promise.resolve(type);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }
    
    // Méthode statique pour le service
    public static int getTaskIntervalForService(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        int interval = prefs.getInt(KEY_TASK_INTERVAL, 60000);
        android.util.Log.d("PreferencesModule", "📖 Service lit interval: " + interval + "ms");
        return interval;
    }

    // ✅ Sauvegarder les tokens depuis JS (appelé après login)
    @ReactMethod
    public void setTokens(String accessToken, String refreshToken, Promise promise) {
        try {
            SharedPreferences prefs = getReactApplicationContext()
                .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

            prefs.edit()
                .putString(KEY_ACCESS_TOKEN, accessToken)
                .putString(KEY_REFRESH_TOKEN, refreshToken)
                .apply();

            android.util.Log.d("PreferencesModule", "✅ Tokens sauvegardés dans SharedPreferences");
            promise.resolve(true);
        } catch (Exception e) {
            android.util.Log.e("PreferencesModule", "❌ Erreur sauvegarde tokens", e);
            promise.reject("ERROR", e.getMessage());
        }
    }

    // ✅ Mettre à jour uniquement l'accessToken (après refresh)
    @ReactMethod
    public void setAccessToken(String accessToken, Promise promise) {
        try {
            SharedPreferences prefs = getReactApplicationContext()
                .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

            prefs.edit()
                .putString(KEY_ACCESS_TOKEN, accessToken)
                .apply();

            android.util.Log.d("PreferencesModule", "✅ accessToken mis à jour");
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    // ✅ Supprimer les tokens (logout)
    @ReactMethod
    public void clearTokens(Promise promise) {
        try {
            SharedPreferences prefs = getReactApplicationContext()
                .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

            prefs.edit()
                .remove(KEY_ACCESS_TOKEN)
                .remove(KEY_REFRESH_TOKEN)
                .apply();

            android.util.Log.d("PreferencesModule", "🧹 Tokens supprimés");
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    // ✅ Lire le refreshToken depuis JS (utilisé par le background task)
    @ReactMethod
    public void getRefreshToken(Promise promise) {
        try {
            SharedPreferences prefs = getReactApplicationContext()
                .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String token = prefs.getString(KEY_REFRESH_TOKEN, null);
            promise.resolve(token);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    // ✅ Méthodes statiques pour le background task (lecture sans contexte React)
    public static String getAccessTokenForService(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getString(KEY_ACCESS_TOKEN, null);
    }

    public static String getRefreshTokenForService(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getString(KEY_REFRESH_TOKEN, null);
    }

    public static void saveAccessTokenForService(Context context, String accessToken) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_ACCESS_TOKEN, accessToken).apply();
    }
}