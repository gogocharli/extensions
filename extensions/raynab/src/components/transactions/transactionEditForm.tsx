import { formatToReadablePrice, formatToYnabAmount, isNumber } from '@lib/utils';
import { ActionPanel, Action, Form, Icon, Color, showToast, Toast } from '@raycast/api';
import { CurrencyFormat, TransactionDetail } from '@srcTypes';
import { useState } from 'react';
import { updateTransaction } from '@lib/api';

import { SaveTransaction } from 'ynab';

import { usePayees } from '@hooks/usePayees';
import { useLocalStorage } from '@hooks/useLocalStorage';
import { useCategoryGroups } from '@hooks/useCategoryGroups';

interface FormValues {
  date: Date;
  amount: string;
  payee_id: string;
  memo?: string;
  category_id: string;
  flag_color: SaveTransaction.FlagColorEnum | '';
}

export function TransactionEditForm({ transaction }: { transaction: TransactionDetail }) {
  const [activeBudgetCurrency] = useLocalStorage<CurrencyFormat | null>('activeBudgetCurrency', null);
  const [activeBudgetId] = useLocalStorage('activeBudgetId', '');

  const { data: payees, isValidating: isPayeesLoading } = usePayees(activeBudgetId);
  const { data: categoryGroups, isValidating: isLoadingCategories } = useCategoryGroups(activeBudgetId);

  async function handleSubmit(values: FormValues) {
    if (!isValidFormSubmission(values)) return;

    const submittedValues = {
      ...transaction,
      ...values,
      date: values.date.toISOString(),
      flag_color: values.flag_color || null,
      amount: formatToYnabAmount(amount),
      memo: values.memo || null,
    };
    const toast = await showToast({ style: Toast.Style.Animated, title: 'Updating Transaction' });

    updateTransaction(activeBudgetId, transaction.id, submittedValues).then(() => {
      toast.style = Toast.Style.Success;
      toast.title = 'Transaction updated successfully';
    });
  }

  const [amount, setAmount] = useState(formatToReadablePrice({ amount: transaction.amount, locale: false }));
  const [amountError, setAmountError] = useState<string | undefined>();
  const currencySymbol = activeBudgetCurrency?.currency_symbol;
  return (
    <Form
      navigationTitle="Edit Transaction"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Edit Transaction"
        text="Change one or more of the following fields to update the transaction. Amount can be positive or negative."
      />
      <Form.DatePicker
        id="date"
        title="Date of Transaction"
        defaultValue={new Date(transaction.date)}
        type={Form.DatePicker.Type.Date}
      />
      <Form.TextField
        id="amount"
        title={`Amount ${currencySymbol ? `(${currencySymbol})` : ''}`}
        value={amount}
        onChange={setAmount}
        error={amountError}
        onBlur={(event) => {
          const currentAmount = event.target.value ?? '';
          if (!isNumber(currentAmount)) {
            setAmountError(currentAmount ? `"${currentAmount} "is not a valid number` : 'Enter a valid number');
          } else {
            setAmountError(undefined);
          }
        }}
      />
      <Form.Dropdown
        id="payee_id"
        title="Payee"
        isLoading={isPayeesLoading}
        defaultValue={transaction.payee_id ?? undefined}
      >
        {payees?.map((payee) => (
          <Form.Dropdown.Item key={payee.id} value={payee.id} title={payee.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="category_id"
        title="Category"
        isLoading={isLoadingCategories}
        defaultValue={transaction.category_id ?? undefined}
      >
        {categoryGroups
          ?.flatMap((g) => g.categories)
          .map((category) => (
            <Form.Dropdown.Item key={category.id} value={category.id} title={category.name} />
          ))}
      </Form.Dropdown>
      <Form.TextArea
        id="memo"
        title="Memo"
        defaultValue={transaction.memo ?? ''}
        placeholder="Enter additional information…"
      />
      <Form.Dropdown id="flag_color" title="Flag Color" defaultValue={transaction.flag_color?.toString()}>
        <Form.Dropdown.Item value="" title="No Flag" icon={{ source: Icon.Dot }} />
        <Form.Dropdown.Item value="red" title="Red" icon={{ source: Icon.Dot, tintColor: Color.Red }} />
        <Form.Dropdown.Item value="orange" title="Orange" icon={{ source: Icon.Dot, tintColor: Color.Orange }} />
        <Form.Dropdown.Item value="yellow" title="Yellow" icon={{ source: Icon.Dot, tintColor: Color.Yellow }} />
        <Form.Dropdown.Item value="green" title="Green" icon={{ source: Icon.Dot, tintColor: Color.Green }} />
        <Form.Dropdown.Item value="blue" title="Blue" icon={{ source: Icon.Dot, tintColor: Color.Blue }} />
        <Form.Dropdown.Item value="purple" title="Purple" icon={{ source: Icon.Dot, tintColor: Color.Purple }} />
      </Form.Dropdown>
    </Form>
  );
}

const REQUIRED_FORM_VALUES = new Map([['payee_id', 'Payee']]);

function isValidFormSubmission(values: FormValues) {
  let isValid = true;

  Object.entries({ ...values }).forEach(([key, value]) => {
    if (!value && REQUIRED_FORM_VALUES.get(key)) {
      isValid = false;

      showToast({
        style: Toast.Style.Failure,
        title: `The ${REQUIRED_FORM_VALUES.get(key)} is required`,
        message: 'Please enter a valid value for the field.',
      });

      return;
    }
  });
  return isValid;
}
