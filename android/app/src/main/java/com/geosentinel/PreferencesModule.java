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
}
