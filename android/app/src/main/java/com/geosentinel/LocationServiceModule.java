package com.geosentinel;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.module.annotations.ReactModule;

@ReactModule(name = LocationServiceModule.NAME)
public class LocationServiceModule extends ReactContextBaseJavaModule {
    public static final String NAME = "LocationServiceBridge";
    
    LocationServiceModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public String getName() {
        return NAME;
    }

    @ReactMethod
    public void startService(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            Intent serviceIntent = new Intent(context, LocationForegroundService.class);
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
            
            android.util.Log.d("LocationServiceModule", "Foreground service started");
            promise.resolve(true);
            
        } catch (Exception e) {
            android.util.Log.e("LocationServiceModule", "Error starting service", e);
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void stopService(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            Intent serviceIntent = new Intent(context, LocationForegroundService.class);
            context.stopService(serviceIntent);
            
            android.util.Log.d("LocationServiceModule", "Foreground service stopped");
            promise.resolve(true);
            
        } catch (Exception e) {
            android.util.Log.e("LocationServiceModule", "Error stopping service", e);
            promise.reject("ERROR", e.getMessage());
        }
    }
}