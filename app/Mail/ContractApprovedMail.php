<?php

namespace App\Mail;

use App\Models\Worker;
use App\Models\Contract;
use App\Models\Assignment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Email sent to a worker (with CC to PIC) when Admin approves
 * a contract creation or update DataRequest.
 */
class ContractApprovedMail extends Mailable
{
    use Queueable, SerializesModels;

    public Worker $worker;
    public Contract $contract;
    public Assignment $assignment;

    /**
     * Create a new message instance.
     *
     * @param Worker     $worker     The worker the contract belongs to.
     * @param Contract   $contract   The approved contract.
     * @param Assignment $assignment The assignment associated with the contract.
     */
    public function __construct(Worker $worker, Contract $contract, Assignment $assignment)
    {
        $this->worker = $worker;
        $this->contract = $contract;
        $this->assignment = $assignment;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Pemberitahuan Kontrak Kerja — PT. Alfa Reka Usaha',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            markdown: 'emails.contract_approved',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
