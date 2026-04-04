package com.arqops.common.storage;

import java.io.Closeable;
import java.io.IOException;
import java.io.InputStream;

/** Stream returned from Google Drive download; must be closed by the caller. */
public record FileDownload(InputStream inputStream, String fileName, String contentType) implements Closeable {

    @Override
    public void close() throws IOException {
        if (inputStream != null) {
            inputStream.close();
        }
    }
}
