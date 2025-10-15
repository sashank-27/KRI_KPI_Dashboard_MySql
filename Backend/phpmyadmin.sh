#!/bin/bash

echo "🔧 phpMyAdmin IP Access Configuration for Ubuntu"
echo "================================================"

# Function to check if phpMyAdmin is installed
check_phpmyadmin() {
    if [ -d "/usr/share/phpmyadmin" ] || [ -d "/var/www/html/phpmyadmin" ]; then
        echo "✅ phpMyAdmin is installed"
        return 0
    else
        echo "❌ phpMyAdmin not found"
        echo "💡 Install with: sudo apt update && sudo apt install phpmyadmin"
        return 1
    fi
}

# Function to configure Apache for IP access
configure_apache_ip_access() {
    echo ""
    echo "🔧 Configuring Apache for IP access..."
    
    # Common phpMyAdmin Apache config locations
    CONF_LOCATIONS=(
        "/etc/apache2/conf-available/phpmyadmin.conf"
        "/etc/phpmyadmin/apache.conf"
        "/etc/apache2/conf.d/phpmyadmin.conf"
    )
    
    for conf_file in "${CONF_LOCATIONS[@]}"; do
        if [ -f "$conf_file" ]; then
            echo "📝 Found config file: $conf_file"
            
            # Backup original config
            sudo cp "$conf_file" "${conf_file}.backup.$(date +%Y%m%d_%H%M%S)"
            echo "💾 Backup created: ${conf_file}.backup.$(date +%Y%m%d_%H%M%S)"
            
            # Show current restrictions
            echo "📋 Current access restrictions:"
            grep -n "Require\|Allow\|Deny" "$conf_file" || echo "No restrictions found"
            
            echo ""
            echo "🔧 Choose configuration option:"
            echo "1. Allow access from specific IP"
            echo "2. Allow access from IP range/subnet"
            echo "3. Allow access from all IPs (WARNING: Less secure)"
            echo "4. Show current configuration only"
            
            read -p "Enter choice (1-4): " choice
            
            case $choice in
                1)
                    read -p "Enter your IP address: " user_ip
                    if [[ $user_ip =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
                        # Add IP to allowed list
                        sudo sed -i "/<Directory \/usr\/share\/phpmyadmin>/,/<\/Directory>/ {
                            /Require local/a\\
                            Require ip $user_ip
                        }" "$conf_file"
                        echo "✅ Added IP $user_ip to allowed list"
                    else
                        echo "❌ Invalid IP format"
                    fi
                    ;;
                2)
                    read -p "Enter subnet (e.g., 192.168.1.0/24): " subnet
                    sudo sed -i "/<Directory \/usr\/share\/phpmyadmin>/,/<\/Directory>/ {
                        /Require local/a\\
                        Require ip $subnet
                    }" "$conf_file"
                    echo "✅ Added subnet $subnet to allowed list"
                    ;;
                3)
                    echo "⚠️  WARNING: This will allow access from any IP!"
                    read -p "Are you sure? (y/N): " confirm
                    if [[ $confirm =~ ^[Yy]$ ]]; then
                        sudo sed -i "/<Directory \/usr\/share\/phpmyadmin>/,/<\/Directory>/ {
                            s/Require local/Require all granted/g
                        }" "$conf_file"
                        echo "✅ Allowed access from all IPs"
                    else
                        echo "❌ Cancelled"
                    fi
                    ;;
                4)
                    echo "📋 Current configuration:"
                    cat "$conf_file"
                    ;;
                *)
                    echo "❌ Invalid choice"
                    ;;
            esac
            
            break
        fi
    done
}

# Function to restart services
restart_services() {
    echo ""
    echo "🔄 Restarting services..."
    
    # Restart Apache
    if sudo systemctl restart apache2; then
        echo "✅ Apache restarted successfully"
    else
        echo "❌ Failed to restart Apache"
        return 1
    fi
    
    # Restart MySQL if needed
    if sudo systemctl is-active --quiet mysql; then
        sudo systemctl restart mysql
        echo "✅ MySQL restarted successfully"
    fi
}

# Function to show access information
show_access_info() {
    echo ""
    echo "🌐 Access Information:"
    echo "====================="
    
    # Get server IP
    SERVER_IP=$(hostname -I | awk '{print $1}')
    echo "🖥️  Server IP: $SERVER_IP"
    
    # Show possible URLs
    echo "🔗 Try accessing phpMyAdmin at:"
    echo "   • http://$SERVER_IP/phpmyadmin"
    echo "   • http://localhost/phpmyadmin"
    
    # Check if Apache is running
    if sudo systemctl is-active --quiet apache2; then
        echo "✅ Apache is running"
    else
        echo "❌ Apache is not running"
        echo "💡 Start with: sudo systemctl start apache2"
    fi
    
    # Check if MySQL is running
    if sudo systemctl is-active --quiet mysql; then
        echo "✅ MySQL is running"
    else
        echo "❌ MySQL is not running"
        echo "💡 Start with: sudo systemctl start mysql"
    fi
}

# Function to create custom phpMyAdmin alias
create_custom_alias() {
    echo ""
    echo "🔧 Creating custom phpMyAdmin alias..."
    
    read -p "Enter custom alias (e.g., 'myadmin'): " alias_name
    
    if [[ $alias_name =~ ^[a-zA-Z0-9_-]+$ ]]; then
        # Create Apache alias configuration
        cat << EOF | sudo tee "/etc/apache2/conf-available/${alias_name}.conf"
Alias /$alias_name /usr/share/phpmyadmin

<Directory /usr/share/phpmyadmin>
    Options SymLinksIfOwnerMatch
    DirectoryIndex index.php
    
    # Allow access from anywhere
    Require all granted
    
    # Or restrict to specific IPs
    # Require ip 192.168.1.0/24
    # Require ip YOUR_IP_HERE
</Directory>

# Disallow web access to directories that don't need it
<Directory /usr/share/phpmyadmin/templates>
    Require all denied
</Directory>
<Directory /usr/share/phpmyadmin/libraries>
    Require all denied
</Directory>
<Directory /usr/share/phpmyadmin/setup/lib>
    Require all denied
</Directory>
EOF

        # Enable the configuration
        sudo a2enconf "$alias_name"
        echo "✅ Custom alias '/$alias_name' created"
        echo "🔗 Access at: http://YOUR_SERVER_IP/$alias_name"
    else
        echo "❌ Invalid alias name. Use only letters, numbers, hyphens, and underscores."
    fi
}

# Main menu
main_menu() {
    echo ""
    echo "📋 What would you like to do?"
    echo "1. Configure IP access for existing phpMyAdmin"
    echo "2. Create custom phpMyAdmin alias"
    echo "3. Show current access information"
    echo "4. Restart web services"
    echo "5. Install phpMyAdmin (if not installed)"
    echo "6. Exit"
    
    read -p "Enter choice (1-6): " main_choice
    
    case $main_choice in
        1)
            if check_phpmyadmin; then
                configure_apache_ip_access
                restart_services
                show_access_info
            fi
            ;;
        2)
            if check_phpmyadmin; then
                create_custom_alias
                restart_services
                show_access_info
            fi
            ;;
        3)
            show_access_info
            ;;
        4)
            restart_services
            ;;
        5)
            echo "🔧 Installing phpMyAdmin..."
            sudo apt update
            sudo apt install phpmyadmin php-mbstring php-zip php-gd php-json php-curl
            sudo phpenmod mbstring
            restart_services
            ;;
        6)
            echo "👋 Goodbye!"
            exit 0
            ;;
        *)
            echo "❌ Invalid choice"
            main_menu
            ;;
    esac
}

# Start the script
check_phpmyadmin
main_menu