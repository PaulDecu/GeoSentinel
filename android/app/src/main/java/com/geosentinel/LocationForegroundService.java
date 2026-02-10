package com.geosentinel;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import androidx.core.app.NotificationCompat;
import com.facebook.react.HeadlessJsTaskService;
import javax.annotation.Nullable;

public class LocationForegroundService extends Service {
    private static final String CHANNEL_ID = "location_foreground_service_v2";
    private static final int NOTIFICATION_ID = 99999;
    private static final int DEFAULT_TASK_INTERVAL = 60000; // 1 minute par défaut
    
    private PowerManager.WakeLock wakeLock;
    private Thread taskThread;
    private boolean isRunning = false;
    private int taskInterval = DEFAULT_TASK_INTERVAL;
    
    @Override
    public void onCreate() {
        super.onCreate();
        android.util.Log.d("LocationFgService", "Service onCreate");
        
        // Lire l'intervalle depuis le module de préférences partagé
        taskInterval = PreferencesModule.getTaskIntervalForService(this);
        android.util.Log.d("LocationFgService", "Intervalle configure: " + taskInterval + "ms");
        
        // Créer le canal de notification
        createNotificationChannel();
        
        // Acquérir Wake Lock
        PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "GestionRisques::LocationFgWakeLock"
        );
        wakeLock.acquire();
        
        android.util.Log.d("LocationFgService", "WakeLock acquired");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        android.util.Log.d("LocationFgService", "Service onStartCommand");
        
        // Démarrer en foreground avec notification
        startForeground(NOTIFICATION_ID, createNotification());
        
        // Démarrer la boucle de tâches
        startTaskLoop();
        
        // START_STICKY = redémarre automatiquement si tué
        return START_STICKY;
    }

    private void startTaskLoop() {
        if (isRunning) {
            android.util.Log.d("LocationFgService", "Task loop already running");
            return;
        }
        
        isRunning = true;
        
        taskThread = new Thread(() -> {
            android.util.Log.d("LocationFgService", "Task loop started with interval: " + taskInterval + "ms");
            
            while (isRunning) {
                try {
                    // Exécuter la tâche Headless JS
                    Intent taskIntent = new Intent(getApplicationContext(), LocationTaskService.class);
                    getApplicationContext().startService(taskIntent);
                    
                    android.util.Log.d("LocationFgService", "Headless task triggered");
                    
                    // Attendre avant la prochaine exécution (intervalle dynamique)
                    Thread.sleep(taskInterval);
                    
                } catch (InterruptedException e) {
                    android.util.Log.e("LocationFgService", "Task loop interrupted", e);
                    break;
                } catch (Exception e) {
                    android.util.Log.e("LocationFgService", "Error in task loop", e);
                }
            }
            
            android.util.Log.d("LocationFgService", "Task loop ended");
        });
        
        taskThread.start();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Suivi GPS Actif",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Surveillance GPS en cours");
            channel.setShowBadge(false);
            
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

        String intervalText = taskInterval < 60000 ? 
            (taskInterval / 1000) + "s" : 
            (taskInterval / 60000) + "min";

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Gestion Risques Active")
            .setContentText("Surveillance GPS - intervalle " + intervalText)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        
        isRunning = false;
        
        if (taskThread != null && taskThread.isAlive()) {
            taskThread.interrupt();
        }
        
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        
        android.util.Log.d("LocationFgService", "Service destroyed");
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}