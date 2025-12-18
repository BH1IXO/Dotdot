#!/usr/bin/expect -f
# 自动部署脚本

set timeout 600
set server_ip "123.57.28.44"
set server_user "admin"
set server_password "Taotao.liu@cs2c.com.cn"

# 上传文件
spawn scp deploy-package.tar.gz ${server_user}@${server_ip}:~/
expect {
    "password:" {
        send "${server_password}\r"
        expect eof
    }
    "yes/no" {
        send "yes\r"
        expect "password:"
        send "${server_password}\r"
        expect eof
    }
}

puts "\n上传完成,开始在服务器上部署...\n"

# SSH到服务器并执行部署
spawn ssh ${server_user}@${server_ip} "cd ~ && tar -xzf deploy-package.tar.gz && cd deploy-package && bash deploy-server.sh"
expect {
    "password:" {
        send "${server_password}\r"
        expect eof
    }
    "yes/no" {
        send "yes\r"
        expect "password:"
        send "${server_password}\r"
        expect eof
    }
}

puts "\n部署完成!\n"
