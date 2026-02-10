package com.geosentinel;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.location.Location;
import android.os.Build;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import androidx.core.app.NotificationCompat;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

public class LocationTrackingService extends Service {
    private static final String CHANNEL_ID = "location_tracking_channel";
    private static final int NOTIFICATION_ID = 12345;
    
    private FusedLocationProviderClient fusedLocationClient;
    private LocationCallback locationCallback;
    private PowerManager.WakeLock wakeLock;
    
    private long timeInterval = 10000; // 10 secondes par défaut
    private int distanceInterval = 10; // 10 mètres par défaut
    private String tourneeType = "velo";
    
    private static ReactApplicationContext reactContext;
    
    public static void setReactContext(ReactApplicationContext context) {
        reactContext = context;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);
        
        // Créer le canal de notification
        createNotificationChannel();
        
        // Acquérir Wake Lock
        PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "GestionRisques::LocationWakeLock");
        wakeLock.acquire();
        
        android.util.Log.d("LocationService", "Service créé avec Wake Lock");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Récupérer les paramètres
        if (intent != null) {
            tourneeType = intent.getStringExtra("tourneeType");
            
            // Configurer selon le type de tournée
            switch (tourneeType) {
                case "pieds":
                    timeInterval = 30000; // 30 secondes
                    distanceInterval = 30; // 30 mètres
                    break;
                case "velo":
                    timeInterval = 15000; // 15 secondes
                    distanceInterval = 10; // 10 mètres
                    break;
                case "voiture":
                    timeInterval = 10000; // 10 secondes
                    distanceInterval = 10; // 10 mètres
                    break;
            }
        }
        
        // Démarrer en foreground
        startForeground(NOTIFICATION_ID, createNotification());
        
        // Démarrer le tracking GPS
        startLocationUpdates();
        
        android.util.Log.d("LocationService", "Service démarré - Mode: " + tourneeType);
        
        // START_STICKY = relance automatique si tué
        return START_STICKY;
    }

    private void startLocationUpdates() {
        try {
            LocationRequest locationRequest = new LocationRequest.Builder(
                Priority.PRIORITY_HIGH_ACCURACY,
                timeInterval
            )
            .setMinUpdateIntervalMillis(timeInterval / 2)
            .setMinUpdateDistanceMeters(distanceInterval)
            .build();
            
            locationCallback = new LocationCallback() {
                @Override
                public void onLocationResult(LocationResult locationResult) {
                    if (locationResult == null) {
                        return;
                    }
                    
                    for (Location location : locationResult.getLocations()) {
                        sendLocationToReactNative(location);
                    }
                }
            };
            
            fusedLocationClient.requestLocationUpdates(
                locationRequest,
                locationCallback,
                Looper.getMainLooper()
            );
            
            android.util.Log.d("LocationService", "Tracking GPS démarré");
            
        } catch (SecurityException e) {
            android.util.Log.e("LocationService", "Erreur permissions", e);
        }
    }

    private void sendLocationToReactNative(Location location) {
        if (reactContext != null && reactContext.hasActiveCatalystInstance()) {
            WritableMap params = Arguments.createMap();
            params.putDouble("latitude", location.getLatitude());
            params.putDouble("longitude", location.getLongitude());
            params.putDouble("accuracy", location.getAccuracy());
            params.putDouble("timestamp", location.getTime());
            
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("onLocationUpdate", params);
            
            android.util.Log.d("LocationService", 
                String.format("Position: %.4f, %.4f", 
                    location.getLatitude(), 
                    location.getLongitude()));
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Suivi GPS en arrière-plan",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Surveillance GPS active pour détecter les risques");
            
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }
    }

    private Notification createNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            0,
            notificationIntent,
            PendingIntent.FLAG_IMMUTABLE
        );

        String mode = "";
        switch (tourneeType) {
            case "pieds": mode = "🚶 À pieds"; break;
            case "velo": mode = "🚴 À vélo"; break;
            case "voiture": mode = "🚗 En voiture"; break;
            default: mode = "📍 GPS actif";
        }

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("🛡️ Gestion Risques Active")
            .setContentText(mode + " - Surveillance en cours")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        
        if (fusedLocationClient != null && locationCallback != null) {
            fusedLocationClient.removeLocationUpdates(locationCallback);
        }
        
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        
        android.util.Log.d("LocationService", "Service arrêté");
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}