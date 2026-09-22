import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

type CategoryFilterProps = {
  categories: string[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
};

export function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryFilterProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <TouchableOpacity
        style={[styles.chip, selectedCategory === null && styles.activeChip]}
        onPress={() => onSelectCategory(null)}
      >
        <Text style={styles.chipText}>Ver todos</Text>
      </TouchableOpacity>

      {categories.map((category) => (
        <TouchableOpacity
          key={category}
          style={[styles.chip, selectedCategory === category && styles.activeChip]}
          onPress={() => onSelectCategory(category)}
        >
          <Text style={styles.chipText}>{category}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    backgroundColor: '#171B29',
    borderColor: '#2A3042',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  activeChip: {
    backgroundColor: '#583C8E',
    borderColor: '#7C5DB8',
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});