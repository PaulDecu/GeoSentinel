package com.geosentinel;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            android.util.Log.d("BootReceiver", "Device booted, checking if service should restart");
            
            // TODO: Vérifier dans SharedPreferences si le tracking était actif
            // et relancer le service si nécessaire
            
            // Pour l'instant, on ne fait rien automatiquement
            // L'utilisateur devra relancer manuellement l'app
        }
    }
}