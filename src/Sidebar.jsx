import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import AdminMenu from './AdminMenu';
import styles from './Sidebar.module.css';

const Sidebar = ({ userRole = 'admin', userName = 'Usuário' }) => {
    const [expanded, setExpanded] = useState(true);

    const toggleSidebar = () => {
        setExpanded(!expanded);
    };

    return (
        <div
            className={`${styles.sidebar} ${expanded ? styles.expanded : styles.collapsed}`}
        >
            <div className={styles.header}>
                <div className={styles.logoContainer}>
                    {expanded ? (
                        <span className={styles.logoText}>Control<span className={styles.logoHighlight}>Plus</span></span>
                    ) : (
                        <span className={styles.logoText}>C<span className={styles.logoHighlight}>+</span></span>
                    )}
                </div>
                <button className={styles.toggleBtn} onClick={toggleSidebar}>
                    {expanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                </button>
            </div>

            <div className={styles.content}>
                {userRole === 'admin' ? (
                    <AdminMenu expanded={expanded} />
                ) : (
                    <div className={styles.legacyMenu}>
                        {/* Menu para técnicos ou outros perfis pode ser adicionado aqui */}
                        <div className={styles.legacyItem}>Menu Técnico</div>
                    </div>
                )}
            </div>

            <div className={styles.footer}>
                {expanded && (
                    <div className={styles.userProfile}>
                        <div className={styles.avatar}>{userName.charAt(0).toUpperCase()}</div>
                        <div className={styles.userInfo}>
                            <span className={styles.userName}>{userName}</span>
                            <span className={styles.userRole}>{userRole === 'admin' ? 'Administrador' : 'Técnico'}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Sidebar;
