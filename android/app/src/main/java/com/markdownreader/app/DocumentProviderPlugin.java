package com.markdownreader.app;

import android.content.Intent;
import android.net.Uri;
import androidx.documentfile.provider.DocumentFile;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;

@CapacitorPlugin(name = "DocumentProvider")
public class DocumentProviderPlugin extends Plugin {

    @PluginMethod
    public void takePersistableUriPermission(PluginCall call) {
        String uriString = call.getString("uri");

        if (uriString == null || uriString.isEmpty()) {
            call.reject("URI is required");
            return;
        }

        try {
            Uri uri = Uri.parse(uriString);
            int takeFlags = Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION;

            getContext().getContentResolver().takePersistableUriPermission(uri, takeFlags);

            android.util.Log.d("DocumentProvider", "Took persistable URI permission for: " + uri);
            call.resolve();

        } catch (Exception e) {
            android.util.Log.e("DocumentProvider", "Failed to take persistable URI permission", e);
            call.reject("Failed to take persistable URI permission: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void listDirectory(PluginCall call) {
        String uriString = call.getString("uri");

        android.util.Log.d("DocumentProvider", "listDirectory called with URI: " + uriString);

        if (uriString == null || uriString.isEmpty()) {
            call.reject("URI is required");
            return;
        }

        try {
            Uri uri = Uri.parse(uriString);
            android.util.Log.d("DocumentProvider", "Parsed URI: " + uri.toString());

            DocumentFile documentFile = DocumentFile.fromTreeUri(getContext(), uri);

            if (documentFile == null) {
                android.util.Log.e("DocumentProvider", "DocumentFile.fromTreeUri returned null for URI: " + uri);
                call.reject("Invalid directory URI - DocumentFile is null");
                return;
            }

            if (!documentFile.isDirectory()) {
                android.util.Log.e("DocumentProvider", "URI is not a directory: " + uri);
                call.reject("Invalid directory URI - not a directory");
                return;
            }

            android.util.Log.d("DocumentProvider", "Directory found, listing files...");
            JSArray files = new JSArray();
            DocumentFile[] children = documentFile.listFiles();

            android.util.Log.d("DocumentProvider", "Found " + children.length + " children");

            for (DocumentFile child : children) {
                JSObject fileObj = new JSObject();
                fileObj.put("name", child.getName());
                fileObj.put("uri", child.getUri().toString());
                fileObj.put("isDirectory", child.isDirectory());
                fileObj.put("type", child.isDirectory() ? "directory" : "file");
                fileObj.put("mimeType", child.getType());
                files.put(fileObj);

                android.util.Log.d("DocumentProvider", "  - " + child.getName() + " (isDir: " + child.isDirectory() + ")");
            }

            JSObject result = new JSObject();
            result.put("files", files);
            call.resolve(result);

        } catch (Exception e) {
            android.util.Log.e("DocumentProvider", "Error listing directory", e);
            call.reject("Failed to list directory: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void readFile(PluginCall call) {
        String uriString = call.getString("uri");

        if (uriString == null || uriString.isEmpty()) {
            call.reject("URI is required");
            return;
        }

        try {
            Uri uri = Uri.parse(uriString);
            InputStream inputStream = getContext().getContentResolver().openInputStream(uri);

            if (inputStream == null) {
                call.reject("Failed to open file");
                return;
            }

            BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream));
            StringBuilder content = new StringBuilder();
            String line;

            while ((line = reader.readLine()) != null) {
                content.append(line).append("\n");
            }

            reader.close();
            inputStream.close();

            JSObject result = new JSObject();
            result.put("content", content.toString());
            call.resolve(result);

        } catch (Exception e) {
            call.reject("Failed to read file: " + e.getMessage(), e);
        }
    }
}
