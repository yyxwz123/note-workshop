package com.noteworkshop.file;

import com.noteworkshop.common.BizException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
public class FileStorageService {

    private static final Set<String> ALLOWED = Set.of("jpg", "jpeg", "png", "gif", "webp");

    @Value("${app.upload-dir}")
    private String uploadDir;

    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BizException("请选择要上传的文件");
        }
        String original = file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
        String ext = original.contains(".")
                ? original.substring(original.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT)
                : "";
        if (!ALLOWED.contains(ext)) {
            throw new BizException("只支持 " + ALLOWED + " 格式的图片");
        }
        try {
            Path base = Paths.get(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(base);
            String name = UUID.randomUUID().toString().replace("-", "") + "." + ext;
            Path target = base.resolve(name);
            try (var in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }
            log.info("文件上传成功 original={} saved={} size={}", original, name, file.getSize());
            return "/uploads/" + name;
        } catch (IOException e) {
            throw new BizException(500, "文件保存失败");
        }
    }
}
