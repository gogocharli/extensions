import { useState } from 'react';
import { OpenInYnabAction } from '@components/actions';
import { TransactionCreationForm } from '@components/transactions/transactionCreationForm';
import { assessGoalShape, displayGoalType, formatGoalType, formatToReadablePrice, displayGoalColor } from '@lib/utils';
import { Action, ActionPanel, Icon, List } from '@raycast/api';
import type { CurrencyFormat, Category, CategoryGroupWithCategories, BudgetDetailSummary } from '@srcTypes';
import { BudgetDetails } from './budgetDetails';
import { CategoryDetails } from './categoryDetails';
import { CategoryEditForm } from './categoryEditForm';
import { useLocalStorage } from '@raycast/utils';
import { Shortcuts } from '@constants';

export function CategoryGroupSection({
  categoryGroups,
  budget,
}: {
  categoryGroups: CategoryGroupWithCategories[] | undefined;
  budget: BudgetDetailSummary | undefined;
}) {
  const { value: activeBudgetCurrency } = useLocalStorage<CurrencyFormat | null>('activeBudgetCurrency', null);
  const [showProgress, setshowProgress] = useState(false);

  return (
    <>
      {categoryGroups
        ?.filter((group) => group.name !== 'Internal Master Category')
        ?.map((group) => (
          <List.Section key={group.id} title={group.name} subtitle={`${group.categories.length} Categories`}>
            {group.categories
              .filter((category) => !category.hidden)
              .map((category) => (
                <List.Item
                  key={category.id}
                  id={category.id}
                  title={category.name}
                  accessories={[
                    category.goal_type && !showProgress
                      ? {
                          icon: displayGoalType(category),
                          tooltip: formatGoalType(category, activeBudgetCurrency),
                        }
                      : {},
                    {
                      tag: {
                        value: showProgress
                          ? renderProgressTitle(category)
                          : formatToReadablePrice({ amount: category.balance, currency: activeBudgetCurrency }),
                        color: displayGoalColor(assessGoalShape(category)),
                      },
                    },
                  ]}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section title="Inspect Budget">
                        <Action.Push
                          title="Show Category"
                          icon={Icon.Eye}
                          target={<CategoryDetails category={category} />}
                        />
                        <Action.Push
                          title="Show Monthly Budget"
                          icon={Icon.Envelope}
                          target={<BudgetDetails budget={budget} />}
                        />
                        <OpenInYnabAction />
                        <Action
                          icon={Icon.Binoculars}
                          title={`${showProgress ? 'Hide' : 'Show'} Progress`}
                          onAction={() => setshowProgress((s) => !s)}
                          shortcut={Shortcuts.ShowBudgetProgress}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section title="Modify List View">
                        <Action.Push
                          title="Edit Category"
                          icon={Icon.Pencil}
                          target={<CategoryEditForm category={category} />}
                          shortcut={Shortcuts.EditBudgetCategory}
                        />
                        <Action.Push
                          title="Create New Transaction"
                          icon={Icon.Plus}
                          target={<TransactionCreationForm categoryId={category.id} />}
                          shortcut={Shortcuts.CreateNewTransaction}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              ))}
          </List.Section>
        ))}
    </>
  );
}

const FULL_SYMBOL = '●';
const EMPTY_SYMBOL = '○';
const MAX_SYMBOL_COUNT = 10;
function renderProgressTitle(category: Category) {
  const percentage = category.goal_percentage_complete;

  if (!category.goal_type) return 'N/A';

  const fullSymbolsCount = Math.min(Math.round(((percentage ?? 0) * MAX_SYMBOL_COUNT) / 100), 100);

  const emptySymbolsCount = MAX_SYMBOL_COUNT - fullSymbolsCount;

  return `${FULL_SYMBOL.repeat(fullSymbolsCount)}${EMPTY_SYMBOL.repeat(emptySymbolsCount)} ${percentage
    ?.toString()
    .padStart(3, ' ')}%`;
}
