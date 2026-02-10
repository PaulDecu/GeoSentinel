package com.geosentinel;

import android.content.Intent;
import com.facebook.react.HeadlessJsTaskService;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.jstasks.HeadlessJsTaskConfig;
import javax.annotation.Nullable;

public class LocationTaskService extends HeadlessJsTaskService {

    @Override
    protected @Nullable HeadlessJsTaskConfig getTaskConfig(Intent intent) {
        return new HeadlessJsTaskConfig(
            "LocationTracking", // Nom de la tâche enregistrée dans index.js
            Arguments.createMap(),
            60000, // Timeout de 60 secondes
            true  // Autorisé en foreground
        );
    }
}