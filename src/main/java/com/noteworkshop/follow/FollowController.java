package com.noteworkshop.follow;

import com.noteworkshop.common.PageResult;
import com.noteworkshop.common.Result;
import com.noteworkshop.follow.dto.AuthorVO;
import com.noteworkshop.security.UserContext;
import com.noteworkshop.user.User;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@Tag(name = "关注与作者", description = "关注/取关、粉丝、热门作者")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class FollowController {

    private final FollowService followService;

    @PostMapping("/users/{id}/follow")
    public Result<Map<String, Object>> follow(@PathVariable Long id) {
        return Result.ok(followService.follow(UserContext.require(), id));
    }

    @DeleteMapping("/users/{id}/follow")
    public Result<Map<String, Object>> unfollow(@PathVariable Long id) {
        return Result.ok(followService.unfollow(UserContext.require(), id));
    }

    @GetMapping("/users/{id}/followers")
    public Result<PageResult<User>> followers(@PathVariable Long id,
                                              @RequestParam(defaultValue = "1") long page,
                                              @RequestParam(defaultValue = "10") long size) {
        return Result.ok(followService.followers(id, page, size));
    }

    @GetMapping("/users/{id}/following")
    public Result<PageResult<User>> following(@PathVariable Long id,
                                              @RequestParam(defaultValue = "1") long page,
                                              @RequestParam(defaultValue = "10") long size) {
        return Result.ok(followService.following(id, page, size));
    }

    @GetMapping("/public/users/{id}")
    public Result<AuthorVO> profile(@PathVariable Long id) {
        return Result.ok(followService.profile(id, null));
    }

    @GetMapping("/public/authors/hot")
    public Result<List<AuthorVO>> hot(@RequestParam(defaultValue = "10") int limit) {
        return Result.ok(followService.hotAuthors(limit));
    }
}
