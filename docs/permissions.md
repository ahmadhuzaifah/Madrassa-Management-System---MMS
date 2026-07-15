# Permission reference

## System roles

- `ADMIN`: full administrative access
- `USER`: standard authenticated access

## Permission examples

- `users:create`
- `users:read`
- `users:update`
- `users:delete`
- `organizations:manage`
- `billing:view`
- `reports:export`
- `logs:read`

## Notes

- Role membership is stored in `User.role`
- Role-to-permission mappings are stored in the database for admin management screens
- Authorization checks currently gate admin routes by role while the permission matrix remains configurable
