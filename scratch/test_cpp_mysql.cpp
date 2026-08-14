#include <stdio.h>
#include <mysql.h>

int main() {
    MYSQL *conn = mysql_init(NULL);
    if (!conn) {
        printf("mysql_init failed\n");
        return 1;
    }
    printf("Connecting to MySQL...\n");
    if (!mysql_real_connect(conn, "127.0.0.1", "root", "12255", "perfumes_v2", 3306, NULL, 0)) {
        printf("Connection failed: %s\n", mysql_error(conn));
        return 1;
    }
    printf("Connected successfully to MySQL!\n");
    mysql_close(conn);
    return 0;
}
