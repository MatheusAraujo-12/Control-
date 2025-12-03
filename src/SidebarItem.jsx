import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import styles from './SidebarItem.module.css';

const SidebarItem = ({ icon: Icon, label, path, subItems = [], expanded: sidebarExpanded }) => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();
    const hasSubItems = subItems.length > 0;

    // Verificar se algum subitem está ativo para manter o menu aberto
    useEffect(() => {
        if (hasSubItems) {
            const isSubItemActive = subItems.some(item => location.pathname === item.path);
            if (isSubItemActive) {
                setIsOpen(true);
            }
        }
    }, [location.pathname, hasSubItems, subItems]);

    const isActive = hasSubItems
        ? subItems.some(item => location.pathname === item.path)
        : location.pathname === path;

    const toggleSubMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    const content = (
        <>
            <div className={styles.iconContainer}>
                {Icon && <Icon size={20} />}
            </div>

            {sidebarExpanded && (
                <div className={styles.labelContainer}>
                    <span className={styles.label}>{label}</span>
                    {hasSubItems && (
                        <span className={styles.chevron}>
                            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </span>
                    )}
                </div>
            )}
        </>
    );

    return (
        <div className={styles.itemContainer}>
            {hasSubItems ? (
                <div
                    className={`${styles.item} ${isActive ? styles.active : ''} ${!sidebarExpanded ? styles.collapsed : ''}`}
                    onClick={toggleSubMenu}
                >
                    {content}
                </div>
            ) : (
                <Link
                    to={path}
                    className={`${styles.item} ${isActive ? styles.active : ''} ${!sidebarExpanded ? styles.collapsed : ''}`}
                >
                    {content}
                </Link>
            )}

            {sidebarExpanded && hasSubItems && (
                <div className={`${styles.subMenu} ${isOpen ? styles.open : ''}`}>
                    {subItems.map((subItem, index) => (
                        <Link
                            key={index}
                            to={subItem.path || '#'}
                            className={`${styles.subItem} ${location.pathname === subItem.path ? styles.subItemActive : ''}`}
                        >
                            {subItem.label}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SidebarItem;
