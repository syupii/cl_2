// Hand-written repository methods for payment_methods table.
// (sqlc not re-run; written manually to match sqlc style.)

package repository

import (
	"context"

	"github.com/google/uuid"
)

const listPaymentMethods = `SELECT id, user_id, name, created_at
FROM public.payment_methods
WHERE user_id = $1
ORDER BY name ASC`

func (q *Queries) ListPaymentMethods(ctx context.Context, userID uuid.UUID) ([]PaymentMethod, error) {
	rows, err := q.db.Query(ctx, listPaymentMethods, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []PaymentMethod
	for rows.Next() {
		var i PaymentMethod
		if err := rows.Scan(&i.ID, &i.UserID, &i.Name, &i.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	return items, rows.Err()
}

const createPaymentMethod = `INSERT INTO public.payment_methods (user_id, name)
VALUES ($1, $2)
RETURNING id, user_id, name, created_at`

func (q *Queries) CreatePaymentMethod(ctx context.Context, userID uuid.UUID, name string) (PaymentMethod, error) {
	row := q.db.QueryRow(ctx, createPaymentMethod, userID, name)
	var i PaymentMethod
	err := row.Scan(&i.ID, &i.UserID, &i.Name, &i.CreatedAt)
	return i, err
}

const deletePaymentMethod = `DELETE FROM public.payment_methods WHERE id = $1 AND user_id = $2`

func (q *Queries) DeletePaymentMethod(ctx context.Context, id, userID uuid.UUID) error {
	_, err := q.db.Exec(ctx, deletePaymentMethod, id, userID)
	return err
}
