// ====================================
// ЭКРАН АРХИВА ПРИВЫЧЕК - ПОЛНАЯ СТРАНИЦА
// ArchiveScreen.js - Управление завершенными привычками
// ====================================

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Alert,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEMES, SPACING, BORDER_RADIUS, TYPOGRAPHY } from './constants';
import { dateUtils } from './utils';

const ArchiveScreen = ({
  archivedHabits = [],
  onRestoreHabit = () => {},
  onDeleteHabit = () => {},
  onBack = () => {}, // НОВЫЙ ПРОП ДЛЯ ВОЗВРАТА
  theme = 'blue',
  isDarkMode = false,
  safeAreaInsets = { top: 0, bottom: 0, left: 0, right: 0 }
}) => {
  const [selectedSort, setSelectedSort] = useState('date'); // date, name, completion
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const colors = THEMES[theme][isDarkMode ? 'dark' : 'light'];

  // === СОРТИРОВКА АРХИВА ===
  const sortedHabits = useMemo(() => {
    const sorted = [...archivedHabits];
    
    switch (selectedSort) {
      case 'date':
        return sorted.sort((a, b) => new Date(b.archivedAt) - new Date(a.archivedAt));
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'completion':
        return sorted.sort((a, b) => b.completionPercentage - a.completionPercentage);
      default:
        return sorted;
    }
  }, [archivedHabits, selectedSort]);

  // === ОБРАБОТЧИКИ ===
  const handleRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleRestoreHabit = (habitId) => {
    Alert.alert(
      'Восстановить привычку?',
      'Привычка будет возвращена в активные и продолжит отслеживание.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Восстановить',
          onPress: () => onRestoreHabit(habitId)
        }
      ]
    );
  };

  const handleDeleteHabit = (habitId, habitName) => {
    Alert.alert(
      'Удалить из архива?',
      `"${habitName}" будет удалена навсегда. Это действие нельзя отменить.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => onDeleteHabit(habitId)
        }
      ]
    );
  };

  // === КОМПОНЕНТЫ ===
  const renderHeader = () => (
    <View style={[
      styles.header, 
      { 
        backgroundColor: colors.background,
        paddingTop: Math.max(safeAreaInsets.top, SPACING.md),
        paddingLeft: Math.max(safeAreaInsets.left, SPACING.md),
        paddingRight: Math.max(safeAreaInsets.right, SPACING.md),
      }
    ]}>
      <View style={styles.headerTop}>
        {/* КНОПКА НАЗАД */}
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surface }]}
          onPress={onBack}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Архив
        </Text>
        
        <TouchableOpacity
          style={[styles.sortButton, { backgroundColor: colors.surface }]}
          onPress={() => setShowSortMenu(true)}
        >
          <Ionicons name="filter-outline" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>
      
      <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
        {archivedHabits.length} завершенных привычек
      </Text>
    </View>
  );

  const renderArchiveCard = (habit) => {
    const startDate = new Date(habit.createdAt);
    const endDate = new Date(habit.archivedAt);
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    return (
      <View
        key={habit.id}
        style={[styles.archiveCard, { 
          backgroundColor: colors.card, 
          borderColor: colors.border 
        }]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {habit.name}
            </Text>
            <View style={[
              styles.completionBadge, 
              { 
                backgroundColor: habit.completionPercentage >= 80 
                  ? colors.success + '20' 
                  : habit.completionPercentage >= 60 
                    ? colors.warning + '20' 
                    : colors.error + '20'
              }
            ]}>
              <Text style={[
                styles.completionText, 
                { 
                  color: habit.completionPercentage >= 80 
                    ? colors.success 
                    : habit.completionPercentage >= 60 
                      ? colors.warning 
                      : colors.error
                }
              ]}>
                {habit.completionPercentage}%
              </Text>
            </View>
          </View>
          
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary + '20' }]}
              onPress={() => handleRestoreHabit(habit.id)}
            >
              <Ionicons name="refresh" size={16} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.error + '20' }]}
              onPress={() => handleDeleteHabit(habit.id, habit.name)}
            >
              <Ionicons name="trash-outline" size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.cardStats}>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Период
            </Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {dateUtils.formatDateRange(startDate, endDate)}
            </Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Длительность
            </Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {totalDays} {totalDays === 1 ? 'день' : totalDays < 5 ? 'дня' : 'дней'}
            </Text>
          </View>
          
          {habit.archiveStats && (
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Выполнено
              </Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {habit.archiveStats.totalFact} из {habit.archiveStats.totalPlan}
              </Text>
            </View>
          )}
        </View>
        
        {habit.description && (
          <View style={styles.cardDescription}>
            <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
              {habit.description}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderSortMenu = () => (
    <Modal
      visible={showSortMenu}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowSortMenu(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowSortMenu(false)}
      >
        <View style={[styles.sortMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sortTitle, { color: colors.text }]}>
            Сортировка
          </Text>
          
          {[
            { key: 'date', label: 'По дате архивирования', icon: 'calendar-outline' },
            { key: 'name', label: 'По названию', icon: 'text-outline' },
            { key: 'completion', label: 'По проценту выполнения', icon: 'stats-chart-outline' }
          ].map(option => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.sortOption,
                selectedSort === option.key && { backgroundColor: colors.primary + '10' }
              ]}
              onPress={() => {
                setSelectedSort(option.key);
                setShowSortMenu(false);
              }}
            >
              <Ionicons 
                name={option.icon} 
                size={20} 
                color={selectedSort === option.key ? colors.primary : colors.textSecondary} 
              />
              <Text style={[
                styles.sortOptionText,
                { color: selectedSort === option.key ? colors.primary : colors.text }
              ]}>
                {option.label}
              </Text>
              {selectedSort === option.key && (
                <Ionicons name="checkmark" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="archive-outline" size={64} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        Архив пуст
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Завершенные привычки появятся здесь
      </Text>
      <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
        Долго нажмите на карточку привычки и выберите "Завершить"
      </Text>
    </View>
  );

  // === ОСНОВНОЙ РЕНДЕР ===
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderHeader()}
      
      {archivedHabits.length === 0 ? (
        renderEmptyState()
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingLeft: Math.max(safeAreaInsets.left, SPACING.md),
              paddingRight: Math.max(safeAreaInsets.right, SPACING.md),
              paddingBottom: Math.max(safeAreaInsets.bottom, 120), // место для tabBar
            }
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {sortedHabits.map(renderArchiveCard)}
        </ScrollView>
      )}
      
      {renderSortMenu()}
    </View>
  );
};

// === СТИЛИ ===
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // === ЗАГОЛОВОК ===
  header: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  headerTitle: {
    ...TYPOGRAPHY.h3,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: SPACING.sm,
  },
  
  headerSubtitle: {
    ...TYPOGRAPHY.bodyMedium,
    textAlign: 'center',
  },
  
  sortButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // === КОНТЕНТ ===
  scrollContainer: {
    flex: 1,
  },
  
  scrollContent: {
    paddingTop: SPACING.md,
  },
  
  // === КАРТОЧКА АРХИВА ===
  archiveCard: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  
  cardTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  
  cardTitle: {
    ...TYPOGRAPHY.h4,
    fontWeight: '600',
    flex: 1,
  },
  
  completionBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    marginLeft: SPACING.sm,
  },
  
  completionText: {
    ...TYPOGRAPHY.caption,
    fontWeight: 'bold',
  },
  
  cardActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // === СТАТИСТИКА ===
  cardStats: {
    gap: SPACING.sm,
  },
  
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  statLabel: {
    ...TYPOGRAPHY.bodyMedium,
    flex: 1,
  },
  
  statValue: {
    ...TYPOGRAPHY.bodyMedium,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
  },
  
  // === ОПИСАНИЕ ===
  cardDescription: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  
  descriptionText: {
    ...TYPOGRAPHY.bodyMedium,
    fontStyle: 'italic',
  },
  
  // === ПУСТОЕ СОСТОЯНИЕ ===
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  
  emptyTitle: {
    ...TYPOGRAPHY.h3,
    fontWeight: 'bold',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  
  emptySubtitle: {
    ...TYPOGRAPHY.bodyLarge,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  
  emptyHint: {
    ...TYPOGRAPHY.bodyMedium,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  // === МЕНЮ СОРТИРОВКИ ===
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  
  sortMenu: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    minWidth: 300,
    maxWidth: 400,
  },
  
  sortTitle: {
    ...TYPOGRAPHY.h4,
    fontWeight: '600',
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xs,
  },
  
  sortOptionText: {
    ...TYPOGRAPHY.bodyLarge,
    marginLeft: SPACING.md,
    flex: 1,
  },
});

export default ArchiveScreen;